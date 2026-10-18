package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.auth.dto.*;
import com.mamadou.sutura.auth.service.AuthService;
import com.mamadou.sutura.notification.service.TwoFactorDeliveryService;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = "sutura.auth.require-second-factor=true")
@ActiveProfiles("test")
class ProductionVerificationTest {
  @MockitoBean com.mamadou.sutura.common.ratelimit.DistributedRateLimiter limits;

  @org.junit.jupiter.api.BeforeEach
  void allowOtp() {
    when(limits.tryConsume(anyString(), anyLong(), any())).thenReturn(true);
  }

  @Autowired AuthService auth;
  @Autowired UserRepository users;
  @MockitoBean TwoFactorDeliveryService delivery;

  @Test
  void customerCannotReceiveSessionBeforePhoneOtpAndCannotDisableProductionSecondFactor() {
    String phone =
        "+"
            + java.util.concurrent.ThreadLocalRandom.current()
                .nextLong(1000000000000L, 9999999999999L);
    String password = "test-account-password";
    var code = new java.util.concurrent.atomic.AtomicReference<String>();
    doAnswer(
            call -> {
              code.set(call.getArgument(1));
              return null;
            })
        .when(delivery)
        .sendCode(any(), anyString());
    var registration =
        auth.register(
            new RegisterRequest("Phone", "Test", phone, null, password, Role.USER, false));
    assertTrue(registration.twoFactorRequired());
    assertNull(registration.accessToken());
    assertFalse(users.findByPhoneNumber(phone).orElseThrow().isPhoneVerified());
    var repeated = auth.login(new LoginRequest(phone, password, null, null));
    assertEquals(registration.twoFactorChallengeId(), repeated.twoFactorChallengeId());
    verify(delivery, times(1)).sendCode(any(), anyString());
    var session =
        auth.login(
            new LoginRequest(phone, password, registration.twoFactorChallengeId(), code.get()));
    assertNotNull(session.accessToken());
    assertTrue(users.findByPhoneNumber(phone).orElseThrow().isPhoneVerified());
    assertTrue(auth.login(new LoginRequest(phone, password, null, null)).twoFactorRequired());
  }
}
