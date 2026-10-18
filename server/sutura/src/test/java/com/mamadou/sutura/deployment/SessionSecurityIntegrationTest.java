package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import com.mamadou.sutura.auth.dto.*;
import com.mamadou.sutura.auth.repository.RefreshTokenRepository;
import com.mamadou.sutura.auth.service.*;
import com.mamadou.sutura.common.Exception.*;
import com.mamadou.sutura.common.config.JWTConfig;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class SessionSecurityIntegrationTest {
  @Autowired AuthService auth;
  @Autowired RefreshTokenService tokens;
  @Autowired UserRepository users;
  @Autowired RefreshTokenRepository sessions;
  @Autowired JWTConfig jwt;
  String password = "test-password-with-14-characters";

  User user(boolean twoFactor) {
    String phone =
        "+"
            + Long.toUnsignedString(
                java.util.concurrent.ThreadLocalRandom.current()
                    .nextLong(1000000000000L, 9999999999999L));
    var user =
        User.builder()
            .firstName("Session")
            .lastName("Test")
            .phoneNumber(phone)
            .passwordHash(new BCryptPasswordEncoder(4).encode(password))
            .enabled(true)
            .role(Role.USER)
            .userStatus(UserStatus.ACTIVE)
            .twoFactorEnabled(twoFactor)
            .failedLoginAttempts(0)
            .build();
    if (twoFactor) {
      user.setTwoFactorChallengeId(java.util.UUID.randomUUID().toString());
      user.setTwoFactorCodeHash(new BCryptPasswordEncoder(4).encode("123456"));
      user.setTwoFactorCodeExpiresAt(LocalDateTime.now().plusMinutes(5));
    }
    return users.saveAndFlush(user);
  }

  @Test
  void realJwtRefreshIsHashedWithoutBcryptLengthFailureAndRotates() {
    var user = user(false);
    var login = auth.login(new LoginRequest(user.getPhoneNumber(), password, null, null));
    String raw = login.refreshToken();
    assertTrue(raw.length() > 72);
    var stored = sessions.findByTokenId(jwt.extractTokenId(raw)).orElseThrow();
    assertTrue(stored.getTokenHash().startsWith("sha256:"));
    assertFalse(stored.getTokenHash().contains(raw));
    var rotated = auth.refresh(new RefreshTokenRequest(raw));
    assertNotEquals(raw, rotated.refreshToken());
    assertThrows(InvalidTokenException.class, () -> auth.refresh(new RefreshTokenRequest(raw)));
    assertDoesNotThrow(() -> auth.refresh(new RefreshTokenRequest(rotated.refreshToken())));
  }

  @Test
  void onlyOneConcurrentRefreshCanConsumeToken() throws Exception {
    var user = user(false);
    String raw = tokens.generateRefreshToken(user);
    var pool = Executors.newFixedThreadPool(2);
    var start = new CountDownLatch(1);
    try {
      java.util.concurrent.Callable<Boolean> attempt =
          () -> {
            start.await();
            try {
              tokens.rotateRefreshToken(raw);
              return true;
            } catch (InvalidTokenException expected) {
              return false;
            }
          };
      var first = pool.submit(attempt);
      var second = pool.submit(attempt);
      start.countDown();
      int successes =
          (first.get(15, TimeUnit.SECONDS) ? 1 : 0) + (second.get(15, TimeUnit.SECONDS) ? 1 : 0);
      assertEquals(1, successes);
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void failedSecondFactorsPersistAndLockTheAccount() {
    var user = user(true);
    var request =
        new LoginRequest(user.getPhoneNumber(), password, user.getTwoFactorChallengeId(), "000000");
    for (int i = 0; i < 5; i++)
      assertThrows(InvalidTokenException.class, () -> auth.login(request));
    var stored = users.findById(user.getId()).orElseThrow();
    assertNotNull(stored.getLockedAt());
    assertEquals(5, stored.getFailedLoginAttempts());
    assertEquals(1, stored.getTokenVersion());
    assertNull(stored.getTwoFactorCodeHash());
    assertThrows(
        InvalidPasswordException.class,
        () -> auth.login(new LoginRequest(user.getPhoneNumber(), password, null, null)));
  }

  @Test
  void expiredTemporaryLockAllowsFreshAuthentication() {
    var user = user(false);
    user.setLockedAt(LocalDateTime.now().minusMinutes(16));
    user.setFailedLoginAttempts(5);
    users.saveAndFlush(user);
    assertNotNull(
        auth.login(new LoginRequest(user.getPhoneNumber(), password, null, null)).accessToken());
    var stored = users.findById(user.getId()).orElseThrow();
    assertNull(stored.getLockedAt());
    assertEquals(0, stored.getFailedLoginAttempts());
  }

  @Test
  void logoutAllInvalidatesAccessTokenVersionAndOtherRefreshSessions() {
    var user = user(false);
    String first = tokens.generateRefreshToken(user), other = tokens.generateRefreshToken(user);
    String access = tokens.generateAccessToken(user);
    tokens.logoutAll(first);
    var stored = users.findById(user.getId()).orElseThrow();
    assertNotEquals(
        jwt.extractAllClaims(access).get("tokenVersion", Number.class).longValue(),
        stored.getTokenVersion());
    assertThrows(InvalidTokenException.class, () -> tokens.rotateRefreshToken(other));
    assertThrows(InvalidTokenException.class, () -> tokens.logoutAll(first));
  }
}
