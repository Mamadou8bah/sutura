package com.mamadou.sutura.reconciliation;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.ledger.dto.LedgerPostingRequest;
import com.mamadou.sutura.ledger.enums.*;
import com.mamadou.sutura.ledger.service.*;
import com.mamadou.sutura.reconciliation.dto.ManualReconciliationRequest;
import com.mamadou.sutura.reconciliation.entity.ReconciliationReport;
import com.mamadou.sutura.reconciliation.enums.*;
import com.mamadou.sutura.reconciliation.repository.*;
import com.mamadou.sutura.reconciliation.service.*;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.wallet.entity.*;
import com.mamadou.sutura.wallet.repository.*;
import com.mamadou.sutura.wallet.service.WalletService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ProposalReconciliationTest {
  @Autowired UserRepository users;
  @Autowired WalletService wallets;
  @Autowired WalletRepository walletRepository;
  @Autowired WalletTransactionRepository history;
  @Autowired LedgerAccountService accounts;
  @Autowired LedgerService ledger;
  @Autowired LedgerBalanceComputationService balances;
  @Autowired ReconciliationMismatchRepository mismatches;
  @Autowired ReconciliationReportRepository reports;
  @Autowired ReconciliationService reconciliation;

  @Test
  void cleanHistoryHasNoMismatchAndBrokenHistoryIsRecordedWithoutChangingLedger() {
    var user =
        users.saveAndFlush(
            User.builder()
                .firstName("Proposal")
                .lastName("Acceptance")
                .phoneNumber("+" + System.nanoTime())
                .passwordHash("unused-test-hash")
                .role(Role.USER)
                .enabled(true)
                .userStatus(UserStatus.ACTIVE)
                .build());
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    try {
      long id = wallets.createWallet("Acceptance", "GMD").getId();
      var wallet = walletRepository.findById(id).orElseThrow();
      String reference = "proposal-" + UUID.randomUUID();
      var cash =
          accounts.createAccountEntity(
              "TEST:CASH:" + UUID.randomUUID(), "Test cash", LedgerAccountType.ASSET, "GMD");
      var request = new LedgerPostingRequest();
      request.setTraceId(reference);
      request.setCurrency("GMD");
      request.setPostings(
          List.of(
              entry(cash.getCode(), LedgerPostingSide.DEBIT),
              entry(wallet.getLedgerAccount().getCode(), LedgerPostingSide.CREDIT)));
      ledger.recordFinancialTransaction(request);
      var row =
          history.saveAndFlush(
              WalletTransaction.builder()
                  .wallet(wallet)
                  .amount(new BigDecimal("100"))
                  .transactionType("CREDIT")
                  .reference(reference)
                  .build());
      // Scope the batch to this fixture; persistence, account balances, row locks and mismatch
      // writes are real.
      var batch = mock(WalletRepository.class);
      when(batch.findAll()).thenReturn(new ArrayList<>(List.of(wallet)));
      when(batch.findWithLockById(id)).thenAnswer(call -> walletRepository.findWithLockById(id));
      var checker = new WalletReconciliationService(batch, history, balances, mismatches);
      var clean = report();
      checker.reconcileWalletVsLedger(clean);
      reports.saveAndFlush(clean);
      assertEquals(0, clean.getMismatchesFound());
      assertTrue(mismatches.findByReportId(clean.getId()).isEmpty());
      row.setAmount(new BigDecimal("90"));
      history.saveAndFlush(row);
      var broken = report();
      checker.reconcileWalletVsLedger(broken);
      reports.saveAndFlush(broken);
      assertEquals(1, broken.getMismatchesFound());
      var mismatch = mismatches.findByReportId(broken.getId()).get(0);
      assertEquals(id, mismatch.getEntityId());
      assertEquals(0, new BigDecimal("10").compareTo(mismatch.getVariance()));
      assertFalse(mismatch.isResolved());
      assertEquals(
          0, new BigDecimal("100").compareTo(balances.computeBalance(wallet.getLedgerAccount())));
    } finally {
      SecurityContextHolder.clearContext();
    }
  }

  @Test
  void unsupportedReportsAndIgnoredFiltersCannotPretendToComplete() {
    for (var type : List.of(ReconciliationType.TRANSACTION_FLOW, ReconciliationType.BALANCE_CHECK))
      assertThrows(
          IllegalArgumentException.class,
          () ->
              reconciliation.runManualReconciliation(
                  new ManualReconciliationRequest(type, "Acceptance", null)));
    assertThrows(
        IllegalArgumentException.class,
        () ->
            reconciliation.runManualReconciliation(
                new ManualReconciliationRequest(ReconciliationType.WALLET_LEDGER, " ", null)));
    assertThrows(
        IllegalArgumentException.class,
        () ->
            reconciliation.runManualReconciliation(
                new ManualReconciliationRequest(
                    ReconciliationType.WALLET_LEDGER, "Acceptance", 1L)));
  }

  private ReconciliationReport report() {
    return reports.saveAndFlush(
        ReconciliationReport.builder()
            .reconciliationType(ReconciliationType.WALLET_LEDGER)
            .status(ReconciliationStatus.IN_PROGRESS)
            .startedAt(LocalDateTime.now())
            .totalRecordsChecked(0)
            .mismatchesFound(0)
            .mismatchesResolved(0)
            .automated(false)
            .triggeredBy("TEST")
            .build());
  }

  private LedgerPostingRequest.Entry entry(String account, LedgerPostingSide side) {
    var entry = new LedgerPostingRequest.Entry();
    entry.setAccountCode(account);
    entry.setSide(side);
    entry.setAmount(new BigDecimal("100"));
    return entry;
  }
}
