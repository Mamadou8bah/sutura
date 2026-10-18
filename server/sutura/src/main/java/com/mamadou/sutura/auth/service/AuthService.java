package com.mamadou.sutura.auth.service;

import com.mamadou.sutura.auth.dto.AuthResponse;
import com.mamadou.sutura.auth.dto.LoginRequest;
import com.mamadou.sutura.auth.dto.LogoutRequest;
import com.mamadou.sutura.auth.dto.RefreshTokenRequest;
import com.mamadou.sutura.auth.dto.RefreshTokenResponse;
import com.mamadou.sutura.auth.dto.RegisterRequest;
import com.mamadou.sutura.auth.mapper.AuthMapper;
import com.mamadou.sutura.common.Exception.InvalidPasswordException;
import com.mamadou.sutura.common.Exception.InvalidTokenException;
import com.mamadou.sutura.common.Exception.ProfileAlreadyExistException;
import com.mamadou.sutura.common.metrics.SuturaMetricsService;
import com.mamadou.sutura.notification.service.TwoFactorDeliveryService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.enums.UserStatus;
import com.mamadou.sutura.user.repository.UserRepository;
import io.micrometer.core.instrument.Timer;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

  private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;
  private static final java.util.Set<Role> SELF_REGISTER_ROLES =
      java.util.EnumSet.of(Role.USER, Role.DEVELOPER);

  private final UserRepository userRepository;
  private final BCryptPasswordEncoder passwordEncoder;
  private final RefreshTokenService refreshTokenService;
  private final AuthMapper authMapper;
  private final TwoFactorDeliveryService twoFactorDeliveryService;
  private final SuturaMetricsService metricsService;
  private final com.mamadou.sutura.common.ratelimit.DistributedRateLimiter otpLimits;
  private final com.mamadou.sutura.kyc.onboarding.KycOnboardingService onboarding;
  private final SecureRandom secureRandom = new SecureRandom();

  @org.springframework.beans.factory.annotation.Value("${sutura.auth.require-second-factor:false}")
  private boolean requireSecondFactor;

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    metricsService.recordAuthRegisterAttempt();
    log.info("Registration attempt");

    Role role = request.role() == null ? Role.USER : request.role();
    if (role == Role.DEVELOPER && (request.email() == null || request.email().isBlank()))
      throw new IllegalArgumentException("Developer email is required");
    if (request.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new IllegalArgumentException("Password must be at most 72 UTF-8 bytes");
    request =
        new RegisterRequest(
            request.firstName().trim(),
            request.lastName().trim(),
            request.phoneNumber().trim(),
            request.email() == null || request.email().isBlank()
                ? null
                : request.email().trim().toLowerCase(java.util.Locale.ROOT),
            request.password(),
            role,
            request.twoFactorEnabled());
    if (!SELF_REGISTER_ROLES.contains(role)) {
      log.warn("Registration failed: role not allowed for self-registration, role={}", role);
      throw new IllegalArgumentException(
          "This account type must use its dedicated registration flow");
    }

    if (userRepository.existsByPhoneNumber(request.phoneNumber())) {
      log.warn("Registration rejected: duplicate phone");
      throw new ProfileAlreadyExistException("Phone number already registered");
    }
    if (request.email() != null
        && !request.email().isBlank()
        && userRepository.existsByEmailIgnoreCase(request.email())) {
      log.warn("Registration rejected: duplicate email");
      throw new ProfileAlreadyExistException("Email already registered");
    }

    User user = authMapper.toUser(request, passwordEncoder.encode(request.password()));
    if (requireSecondFactor) user.setTwoFactorEnabled(true);
    userRepository.save(user);

    if (requireSecondFactor) {
      String challenge = startTwoFactorChallenge(user);
      userRepository.save(user);
      return authMapper.twoFactorRequired(user, challenge);
    }

    log.info("Registration successful, userId={}, role={}", user.getId(), user.getRole());
    metricsService.recordAuthRegisterSuccess();
    onboarding.enqueue(user);

    String refreshToken = refreshTokenService.generateRefreshToken(user);
    String accessToken = refreshTokenService.generateAccessToken(user);
    return authMapper.authenticated(
        user, accessToken, refreshToken, refreshTokenService.accessTokenTtlSeconds());
  }

  @Transactional(noRollbackFor = {InvalidPasswordException.class, InvalidTokenException.class})
  public AuthResponse login(LoginRequest request) {
    metricsService.recordAuthLoginAttempt();
    Timer.Sample sample = metricsService.startAuthLoginTimer();

    log.info("Login attempt");

    User user =
        userRepository
            .findByLoginIdentifierForUpdate(request.username())
            .orElseThrow(
                () -> {
                  log.warn("Login rejected");
                  metricsService.recordAuthLoginFailure();
                  return new InvalidPasswordException("Invalid username or password");
                });

    if (!user.isEnabled()
        || user.getUserStatus() == UserStatus.SUSPENDED
        || !user.isAccountNonLocked()) {
      log.warn(
          "Login failed: restricted account, userId={}, status={}",
          user.getId(),
          user.getUserStatus());
      metricsService.recordAuthLoginFailure();
      throw new InvalidPasswordException("Account is locked or suspended");
    }

    if (user.getLockedAt() != null && user.isAccountNonLocked()) {
      user.setLockedAt(null);
      user.setFailedLoginAttempts(0);
    }

    if (user.getUserStatus() == UserStatus.BANNED) {
      metricsService.recordAuthLoginFailure();
      throw new InvalidPasswordException("Account is not available");
    }

    if (!passwordEncoder.matches(request.password(), user.getPassword())) {
      log.warn("Login failed: invalid password, userId={}", user.getId());
      recordFailedLogin(user);
      metricsService.recordAuthLoginFailure();
      throw new InvalidPasswordException("Invalid username or password");
    }

    if (user.isTwoFactorEnabled() || requireSecondFactor) {
      if (request.twoFactorCode() == null || request.twoFactorCode().isBlank()) {
        String challengeId = startTwoFactorChallenge(user);
        userRepository.save(user);
        log.info("Login awaiting second factor, userId={}", user.getId());
        return authMapper.twoFactorRequired(user, challengeId);
      }
      verifyTwoFactorCode(user, request.twoFactorChallengeId(), request.twoFactorCode());
      if (user.getRole() == Role.USER || user.getRole() == Role.AGENT) user.setPhoneVerified(true);
      log.info("2FA verification successful, userId={}", user.getId());
    }

    onboarding.enqueue(user);
    user.setLastLoginAt(LocalDateTime.now());
    user.setFailedLoginAttempts(0);
    userRepository.save(user);

    log.info("Login successful, userId={}, role={}", user.getId(), user.getRole());
    metricsService.recordAuthLoginSuccess();

    String refreshToken = refreshTokenService.generateRefreshToken(user);
    String accessToken = refreshTokenService.generateAccessToken(user);

    metricsService.stopAuthLoginTimer(sample);

    return authMapper.authenticated(
        user, accessToken, refreshToken, refreshTokenService.accessTokenTtlSeconds());
  }

  public RefreshTokenResponse refresh(RefreshTokenRequest request) {
    return refreshTokenService.rotateRefreshToken(request.refreshToken());
  }

  @Transactional
  public String logout(LogoutRequest request) {
    if (request.allDevices()) {
      refreshTokenService.logoutAll(request.refreshToken());
      return "Logged out from all devices";
    }
    return refreshTokenService.revokeRefreshToken(request.refreshToken());
  }

  private String startTwoFactorChallenge(User user) {
    if (user.getTwoFactorChallengeId() != null
        && user.getTwoFactorCodeHash() != null
        && user.getTwoFactorCodeExpiresAt() != null
        && user.getTwoFactorCodeExpiresAt().isAfter(LocalDateTime.now().plusMinutes(4)))
      return user.getTwoFactorChallengeId();
    if (!otpLimits.tryConsume("login-otp:" + user.getId(), 3, java.time.Duration.ofMinutes(10)))
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
          "Too many verification codes requested. Please wait before retrying.");
    String challengeId = UUID.randomUUID().toString();
    String code = String.format("%06d", secureRandom.nextInt(1_000_000));

    user.setTwoFactorChallengeId(challengeId);
    user.setTwoFactorCodeHash(passwordEncoder.encode(code));
    user.setTwoFactorCodeExpiresAt(LocalDateTime.now().plusMinutes(5));

    twoFactorDeliveryService.sendCode(user, code);
    return challengeId;
  }

  private void recordFailedLogin(User user) {
    int failedAttempts = user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts();
    int updatedAttempts = failedAttempts + 1;

    user.setFailedLoginAttempts(updatedAttempts);
    if (updatedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      user.setLockedAt(LocalDateTime.now());
      user.setTokenVersion(user.getTokenVersion() + 1);
      clearTwoFactorChallenge(user);
      refreshTokenService.revokeAllUserRefreshTokens(user);
    }
    userRepository.save(user);
  }

  private void verifyTwoFactorCode(User user, String challengeId, String code) {
    if (challengeId == null || !challengeId.equals(user.getTwoFactorChallengeId())) {
      recordFailedLogin(user);
      throw new InvalidTokenException("Invalid 2FA challenge");
    }
    if (user.getTwoFactorCodeExpiresAt() == null
        || user.getTwoFactorCodeExpiresAt().isBefore(LocalDateTime.now())) {
      clearTwoFactorChallenge(user);
      throw new InvalidTokenException("2FA code expired");
    }
    if (user.getTwoFactorCodeHash() == null
        || !passwordEncoder.matches(code, user.getTwoFactorCodeHash())) {
      recordFailedLogin(user);
      throw new InvalidTokenException("Invalid 2FA code");
    }
    clearTwoFactorChallenge(user);
  }

  private void clearTwoFactorChallenge(User user) {
    user.setTwoFactorChallengeId(null);
    user.setTwoFactorCodeHash(null);
    user.setTwoFactorCodeExpiresAt(null);
  }
}
