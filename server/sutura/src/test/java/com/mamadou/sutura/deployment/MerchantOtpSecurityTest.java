package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import com.mamadou.sutura.merchant.dto.MerchantVerifyPhoneRequest;
import com.mamadou.sutura.merchant.entity.MerchantRegistrationSession;
import com.mamadou.sutura.merchant.repository.MerchantRegistrationSessionRepository;
import com.mamadou.sutura.merchant.service.MerchantRegistrationService;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class MerchantOtpSecurityTest {
  @Autowired MerchantRegistrationService service;
  @Autowired MerchantRegistrationSessionRepository sessions;

  MerchantRegistrationSession session() {
    return sessions.saveAndFlush(
        MerchantRegistrationSession.builder()
            .token(java.util.UUID.randomUUID().toString())
            .phoneNumber("+2207999987")
            .otpHash(new BCryptPasswordEncoder(4).encode("123456"))
            .createdAt(LocalDateTime.now())
            .expiresAt(LocalDateTime.now().plusHours(1))
            .otpExpiresAt(LocalDateTime.now().plusMinutes(5))
            .stage(1)
            .build());
  }

  @Test
  void failuresSurviveRollbackAndInvalidateTheChallenge() {
    var session = session();
    for (int i = 0; i < 5; i++)
      assertThrows(
          IllegalArgumentException.class,
          () -> service.verifyPhone(new MerchantVerifyPhoneRequest(session.getToken(), "000000")));
    var stored = sessions.findById(session.getToken()).orElseThrow();
    assertEquals(5, stored.getFailedVerificationAttempts());
    assertNull(stored.getOtpHash());
    assertFalse(stored.isPhoneVerified());
    assertThrows(
        IllegalArgumentException.class,
        () -> service.verifyPhone(new MerchantVerifyPhoneRequest(session.getToken(), "123456")));
  }

  @Test
  void verifiedChallengeCannotBeUsedTwice() {
    var session = session();
    service.verifyPhone(new MerchantVerifyPhoneRequest(session.getToken(), "123456"));
    assertThrows(
        IllegalArgumentException.class,
        () -> service.verifyPhone(new MerchantVerifyPhoneRequest(session.getToken(), "123456")));
    assertTrue(sessions.findById(session.getToken()).orElseThrow().isPhoneVerified());
  }
}
