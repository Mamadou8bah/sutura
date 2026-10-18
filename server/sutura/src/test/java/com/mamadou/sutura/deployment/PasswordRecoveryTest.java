package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.auth.recovery.*;
import com.mamadou.sutura.auth.service.RefreshTokenService;
import com.mamadou.sutura.common.Exception.InvalidTokenException;
import com.mamadou.sutura.common.ratelimit.DistributedRateLimiter;
import com.mamadou.sutura.notification.service.SmsSender;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
class PasswordRecoveryTest {
  @Autowired PasswordRecoveryService recovery;
  @Autowired RecoveryChallengeRepository challenges;
  @Autowired UserRepository users;
  @Autowired RefreshTokenService sessions;
  @MockitoBean SmsSender sms;
  @MockitoBean DistributedRateLimiter limits;

  @BeforeEach
  void allow() {
    when(limits.tryConsume(anyString(), anyLong(), any())).thenReturn(true);
  }

  User user(Role role) {
    return users.saveAndFlush(
        User.builder()
            .firstName("Recovery")
            .lastName("Test")
            .phoneNumber(
                "+"
                    + java.util.concurrent.ThreadLocalRandom.current()
                        .nextLong(1000000000000L, 9999999999999L))
            .passwordHash(new BCryptPasswordEncoder(4).encode("old-test-password"))
            .phoneVerified(true)
            .enabled(true)
            .userStatus(UserStatus.ACTIVE)
            .role(role)
            .build());
  }

  String code() {
    var capture = org.mockito.ArgumentCaptor.forClass(String.class);
    verify(sms, atLeastOnce()).send(anyString(), capture.capture());
    var match = java.util.regex.Pattern.compile("[0-9]{6}").matcher(capture.getValue());
    assertTrue(match.find());
    return match.group();
  }

  @Test
  void verifiedPhoneCanResetOnceAndInvalidatesSessionsAndOtherRecoveryCodes() {
    var user = user(Role.USER);
    String refresh = sessions.generateRefreshToken(user);
    String first = recovery.request(user.getPhoneNumber()),
        second = recovery.request(user.getPhoneNumber());
    String secondCode = code();
    recovery.confirm(second, secondCode, "new-secure-test-password");
    var stored = users.findById(user.getId()).orElseThrow();
    assertTrue(
        new BCryptPasswordEncoder().matches("new-secure-test-password", stored.getPasswordHash()));
    assertEquals(1, stored.getTokenVersion());
    assertThrows(InvalidTokenException.class, () -> sessions.rotateRefreshToken(refresh));
    assertThrows(
        InvalidTokenException.class,
        () -> recovery.confirm(second, secondCode, "another-test-password"));
    assertThrows(
        InvalidTokenException.class,
        () -> recovery.confirm(first, "000000", "another-test-password"));
  }

  @Test
  void failedCodesAreBoundedAndPersisted() {
    var user = user(Role.USER);
    String id = recovery.request(user.getPhoneNumber());
    String wrong = code().equals("000000") ? "999999" : "000000";
    for (int i = 0; i < 5; i++)
      assertThrows(
          InvalidTokenException.class,
          () -> recovery.confirm(id, wrong, "new-secure-test-password"));
    var stored = challenges.findById(id).orElseThrow();
    assertEquals(5, stored.getAttempts());
    assertNotNull(stored.getUsedAt());
    assertTrue(
        new BCryptPasswordEncoder()
            .matches(
                "old-test-password", users.findById(user.getId()).orElseThrow().getPasswordHash()));
  }

  @Test
  void unknownAndStaffAccountsDoNotSendSms() {
    String unknown = recovery.request("+2207999900");
    assertFalse(challenges.existsById(unknown));
    var admin = user(Role.ADMIN);
    String staff = recovery.request(admin.getPhoneNumber());
    assertFalse(challenges.existsById(staff));
    verifyNoInteractions(sms);
  }

  @Test
  void passwordRecoveryDoesNotLiftSuspension() {
    var user = user(Role.USER);
    user.setUserStatus(UserStatus.SUSPENDED);
    users.saveAndFlush(user);
    String id = recovery.request(user.getPhoneNumber());
    recovery.confirm(id, code(), "new-secure-test-password");
    assertEquals(UserStatus.SUSPENDED, users.findById(user.getId()).orElseThrow().getUserStatus());
  }
}
