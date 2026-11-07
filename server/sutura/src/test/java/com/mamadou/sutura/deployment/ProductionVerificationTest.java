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
  @Autowired com.mamadou.sutura.ledger.repository.LedgerPostingRepository postings;
  @Autowired UserRepository users;
  @Autowired com.mamadou.sutura.wallet.repository.WalletRepository wallets;
  @Autowired com.mamadou.sutura.wallet.service.WalletService walletService;
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
    long userId = users.findByPhoneNumber(phone).orElseThrow().getId();
    var personal = wallets.findByUserId(userId);
    assertEquals(1, personal.size());
    assertEquals("GMD", personal.get(0).getCurrency());
    assertEquals("Personal", personal.get(0).getName());
    long walletId = personal.get(0).getId();
    assertEquals(walletId, walletService.ensureCustomerWallet(userId).getId());
    assertEquals(1, wallets.findByUserId(userId).size());
    assertTrue(postings.findByAccount_CodeOrderByPostedAtDesc(walletService.ensureCustomerWallet(userId).getLedgerAccountCode()).isEmpty());
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
    assertEquals(1, wallets.findByUserId(userId).size());
    assertEquals(walletId, wallets.findByUserId(userId).get(0).getId());
    assertTrue(auth.login(new LoginRequest(phone, password, null, null)).twoFactorRequired());
    var frozen = wallets.findById(walletId).orElseThrow();
    frozen.setStatus(com.mamadou.sutura.wallet.enums.WalletStatus.SUSPENDED);
    wallets.saveAndFlush(frozen);
    assertEquals(com.mamadou.sutura.wallet.enums.WalletStatus.SUSPENDED,
        walletService.ensureCustomerWallet(userId).getStatus());
  }

  @Test
  void failedRegistrationDeliveryRollsBackTheDefaultWalletAndUser() {
    String phone = "+" + java.util.concurrent.ThreadLocalRandom.current().nextLong(1000000000000L, 9999999999999L);
    long before = wallets.count();
    doThrow(new IllegalStateException("Test delivery failure")).when(delivery).sendCode(any(), anyString());
    assertThrows(IllegalStateException.class, () -> auth.register(
        new RegisterRequest("Rollback", "Test", phone, null, "test-account-password", Role.USER, false)));
    assertFalse(users.existsByPhoneNumber(phone));
    assertEquals(before, wallets.count());
  }

}
