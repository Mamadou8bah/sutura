package com.mamadou.sutura.auth.recovery;

import com.mamadou.sutura.audit.entity.AuditLog;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.auth.service.RefreshTokenService;
import com.mamadou.sutura.common.Exception.InvalidTokenException;
import com.mamadou.sutura.common.ratelimit.DistributedRateLimiter;
import com.mamadou.sutura.notification.service.SmsSender;
import com.mamadou.sutura.operations.OperationalAlerts;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PasswordRecoveryService {
  private final UserRepository users;
  private final RecoveryChallengeRepository challenges;
  private final BCryptPasswordEncoder passwords;
  private final RefreshTokenService sessions;
  private final SmsSender sms;
  private final DistributedRateLimiter limits;
  private final AuditLogRepository audit;
  private final OperationalAlerts alerts;
  private final java.security.SecureRandom random = new java.security.SecureRandom();

  @Transactional
  public String request(String identifier) {
    String normalized = identifier.trim().toLowerCase(java.util.Locale.ROOT);
    if (!limits.tryConsume(
        "password-recovery:" + fingerprint(normalized), 3, Duration.ofMinutes(10)))
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
          "Too many recovery requests. Please wait before retrying.");
    String id = UUID.randomUUID().toString();
    User user = users.findByLoginIdentifierForUpdate(normalized).orElse(null);
    // Staff recovery is an out-of-band operation; unverified contact details never prove ownership.
    if (!eligible(user)) return id;
    String code = String.format("%06d", random.nextInt(1000000));
    var challenge =
        RecoveryChallenge.builder()
            .id(id)
            .userId(user.getId())
            .codeHash(passwords.encode(code))
            .tokenVersion(user.getTokenVersion())
            .createdAt(LocalDateTime.now())
            .expiresAt(LocalDateTime.now().plusMinutes(10))
            .build();
    challenges.save(challenge);
    try {
      sms.send(
          user.getPhoneNumber(),
          "Your Sutura password recovery code is "
              + code
              + ". It expires in 10 minutes. Never share this code.");
    } catch (RuntimeException failure) {
      challenge.setUsedAt(LocalDateTime.now());
      challenges.save(challenge);
      alerts.enqueue(
          "recovery-delivery:" + id,
          "Recovery SMS requires attention",
          "Password recovery SMS delivery failed for account #"
              + user.getId()
              + ". No credentials were changed.");
    }
    return id;
  }

  @Transactional(noRollbackFor = InvalidTokenException.class)
  public void confirm(String id, String code, String newPassword) {
    if (newPassword.length() < 12
        || newPassword.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new IllegalArgumentException("Use at least 12 characters and at most 72 UTF-8 bytes");
    Long owner = challenges.findOwnerId(id).orElseThrow(() -> invalid());
    User user = users.findForKycUpdate(owner).orElseThrow(() -> invalid());
    var challenge = challenges.findForUpdate(id).orElseThrow(() -> invalid());
    if (challenge.getUsedAt() != null
        || !challenge.getExpiresAt().isAfter(LocalDateTime.now())
        || challenge.getAttempts() >= 5
        || !eligible(user)
        || challenge.getTokenVersion() != user.getTokenVersion()) throw invalid();
    if (!passwords.matches(code, challenge.getCodeHash())) {
      challenge.setAttempts(challenge.getAttempts() + 1);
      if (challenge.getAttempts() >= 5) challenge.setUsedAt(LocalDateTime.now());
      challenges.save(challenge);
      throw invalid();
    }
    if (passwords.matches(newPassword, user.getPasswordHash()))
      throw new IllegalArgumentException("Choose a different password");
    challenge.setUsedAt(LocalDateTime.now());
    challenges.save(challenge);
    user.setPasswordHash(passwords.encode(newPassword));
    user.setTokenVersion(user.getTokenVersion() + 1);
    user.setLockedAt(null);
    user.setFailedLoginAttempts(0);
    user.setTwoFactorCodeHash(null);
    user.setTwoFactorChallengeId(null);
    user.setTwoFactorCodeExpiresAt(null);
    users.save(user);
    sessions.revokeAllUserRefreshTokens(user);
    audit.save(
        AuditLog.builder()
            .actorId(user.getId())
            .actorEmail(user.getEmail() == null ? user.getPhoneNumber() : user.getEmail())
            .actionType("PASSWORD_RECOVERED")
            .entityType("USER")
            .entityId(user.getId())
            .changeDescription(
                "Password recovered through a verified phone challenge; all sessions invalidated")
            .timestamp(LocalDateTime.now())
            .success(true)
            .build());
  }

  private boolean eligible(User user) {
    return user != null
        && user.isPhoneVerified()
        && user.isEnabled()
        && user.getUserStatus() != UserStatus.BANNED
        && (user.getRole() == Role.USER
            || user.getRole() == Role.MERCHANT
            || user.getRole() == Role.AGENT);
  }

  private InvalidTokenException invalid() {
    return new InvalidTokenException("Recovery code is invalid, expired or already used");
  }

  private String fingerprint(String value) {
    try {
      return java.util.HexFormat.of()
          .formatHex(
              java.security.MessageDigest.getInstance("SHA-256")
                  .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 unavailable", e);
    }
  }
}
