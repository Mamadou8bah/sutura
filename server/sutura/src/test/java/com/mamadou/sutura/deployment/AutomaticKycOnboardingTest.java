package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.auth.dto.*;
import com.mamadou.sutura.auth.service.AuthService;
import com.mamadou.sutura.kyc.client.SentinelKycClient;
import com.mamadou.sutura.kyc.dto.SentinelKycResponse;
import com.mamadou.sutura.kyc.onboarding.*;
import com.mamadou.sutura.kyc.repository.KycVerificationRepository;
import com.mamadou.sutura.notification.service.TwoFactorDeliveryService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import java.time.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = "sutura.auth.require-second-factor=true")
@ActiveProfiles("test")
class AutomaticKycOnboardingTest {
  @Autowired AuthService auth;
  @Autowired UserRepository users;
  @Autowired KycOnboardingService onboarding;
  @Autowired KycOnboardingRepository jobs;
  @Autowired KycOnboardingDelivery delivery;
  @Autowired KycVerificationRepository verification;
  @MockitoBean SentinelKycClient sentinel;
  @MockitoBean TwoFactorDeliveryService codes;
  @MockitoBean com.mamadou.sutura.common.ratelimit.DistributedRateLimiter limits;

  @org.junit.jupiter.api.BeforeEach
  void allow() {
    when(limits.tryConsume(anyString(), anyLong(), any())).thenReturn(true);
  }

  @Test
  void registrationQueuesIdentityOnlyAfterPhoneVerificationAndWorkerCreatesSessionOnce() {
    String phone =
        "+"
            + java.util.concurrent.ThreadLocalRandom.current()
                .nextLong(1000000000000L, 9999999999999L);
    var code = new java.util.concurrent.atomic.AtomicReference<String>();
    doAnswer(
            c -> {
              code.set(c.getArgument(1));
              return null;
            })
        .when(codes)
        .sendCode(any(), anyString());
    var registered =
        auth.register(
            new RegisterRequest(
                "New", "Customer", phone, null, "test-onboarding-password", Role.USER, false));
    long id = users.findByPhoneNumber(phone).orElseThrow().getId();
    assertFalse(jobs.existsById(id));
    auth.login(
        new LoginRequest(
            phone, "test-onboarding-password", registered.twoFactorChallengeId(), code.get()));
    assertEquals("PENDING", jobs.findById(id).orElseThrow().getStatus());
    when(sentinel.start(Long.toString(id))).thenReturn(response(id));
    delivery.deliver(id);
    delivery.deliver(id);
    assertEquals("COMPLETED", jobs.findById(id).orElseThrow().getStatus());
    assertEquals("PENDING", verification.findById(id).orElseThrow().getStatus());
    verify(sentinel, times(1)).start(Long.toString(id));
  }

  @Test
  void outageRetainsDurableJobAndRetryDoesNotGrantVerification() {
    var user = user(Role.MERCHANT);
    onboarding.enqueue(user);
    when(sentinel.start(Long.toString(user.getId())))
        .thenThrow(new org.springframework.web.client.ResourceAccessException("offline"));
    delivery.deliver(user.getId());
    var pending = jobs.findById(user.getId()).orElseThrow();
    assertEquals("PENDING", pending.getStatus());
    assertEquals(1, pending.getAttempts());
    assertFalse(verification.existsById(user.getId()));
    pending.setNextAttemptAt(LocalDateTime.now().minusSeconds(1));
    jobs.saveAndFlush(pending);
    doReturn(response(user.getId())).when(sentinel).start(Long.toString(user.getId()));
    delivery.deliver(user.getId());
    assertEquals("COMPLETED", jobs.findById(user.getId()).orElseThrow().getStatus());
  }

  @Test
  void accountRestrictionsDelayOnboardingAndStaffAreNotEnqueued() {
    var user = user(Role.MERCHANT);
    user.setUserStatus(UserStatus.SUSPENDED);
    users.saveAndFlush(user);
    onboarding.enqueue(user);
    delivery.deliver(user.getId());
    assertEquals(0, jobs.findById(user.getId()).orElseThrow().getAttempts());
    verifyNoInteractions(sentinel);
    var admin = user(Role.ADMIN);
    onboarding.enqueue(admin);
    assertFalse(jobs.existsById(admin.getId()));
  }

  private User user(Role role) {
    return users.saveAndFlush(
        User.builder()
            .firstName("Auto")
            .lastName("Identity")
            .phoneNumber("+" + System.nanoTime())
            .email(java.util.UUID.randomUUID() + "@example.invalid")
            .passwordHash("unused")
            .role(role)
            .enabled(true)
            .phoneVerified(true)
            .userStatus(UserStatus.ACTIVE)
            .build());
  }

  private SentinelKycResponse response(long id) {
    return new SentinelKycResponse(
        100000L + id,
        "PENDING",
        Long.toString(id),
        null,
        null,
        null,
        null,
        null,
        "https://identity.example.invalid/kyc/test",
        Instant.now().plusSeconds(600));
  }
}
