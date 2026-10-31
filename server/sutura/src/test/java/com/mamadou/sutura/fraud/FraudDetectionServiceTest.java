package com.mamadou.sutura.fraud;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.fraud.client.FraudDetectionClient;
import com.mamadou.sutura.fraud.config.FraudDetectionProperties;
import com.mamadou.sutura.fraud.dto.FraudDecisionResponse;
import com.mamadou.sutura.fraud.exception.FraudBlockedException;
import com.mamadou.sutura.fraud.service.FraudDetectionService;
import com.mamadou.sutura.fraud.service.FraudEvaluationLogService;
import com.mamadou.sutura.risk.service.RiskFlagService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.wallet.entity.Wallet;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.client.ResourceAccessException;

class FraudDetectionServiceTest {
  private final FraudDetectionClient client = mock(FraudDetectionClient.class);
  private final FraudDetectionProperties properties = new FraudDetectionProperties();
  private final com.mamadou.sutura.ledger.service.LedgerBalanceComputationService balances =
      mock(com.mamadou.sutura.ledger.service.LedgerBalanceComputationService.class);
  private final com.mamadou.sutura.transaction.repository.TransactionRepository transactions =
      mock(com.mamadou.sutura.transaction.repository.TransactionRepository.class);
  private final FraudDetectionService service =
      new FraudDetectionService(
          client,
          properties,
          mock(RiskFlagService.class),
          mock(FraudEvaluationLogService.class),
          balances,
          transactions);

  @Test
  void onlyAllowCanProceed() {
    assertThatCode(() -> service.enforceDecision(decision("allow"))).doesNotThrowAnyException();
  }

  @Test
  void disconnectedSentinelStopsPaymentsBeforeAnyExternalOrLedgerRead() {
    properties.setConnected(false);
    assertThatThrownBy(() -> service.evaluateTransaction("pending", null, null, BigDecimal.ONE, "transfer", null))
        .isInstanceOf(FraudBlockedException.class);
    assertThatThrownBy(() -> service.enforceDecision(null)).isInstanceOf(FraudBlockedException.class);
    verifyNoInteractions(client, balances, transactions);
  }

  @ParameterizedTest
  @ValueSource(strings = {"review", "block", "unknown", ""})
  void preventsNonAllowDecisionsFromReachingExecution(String recommendation) {
    assertThatThrownBy(() -> service.enforceDecision(decision(recommendation)))
        .isInstanceOf(FraudBlockedException.class);
  }

  @Test
  void missingDecisionCannotProceed() {
    assertThatThrownBy(() -> service.enforceDecision(null))
        .isInstanceOf(FraudBlockedException.class);
  }

  @Test
  void timeoutFailsClosed() {
    when(client.score(any())).thenThrow(new ResourceAccessException("timed out"));
    User user = User.builder().id(7L).build();
    Wallet wallet = Wallet.builder().id(9L).currency("GMD").build();
    assertThatThrownBy(
            () ->
                service.checkBeforeExecution(
                    "transfer-42", user, wallet, new BigDecimal("100.00"), "transfer"))
        .isInstanceOf(FraudBlockedException.class);
  }

  @Test
  void sendsLedgerSnapshotForDebitButNeverRecipientBalanceForCredit() {
    var account = new com.mamadou.sutura.ledger.entity.LedgerAccount();
    var wallet = Wallet.builder().id(9L).currency("GMD").ledgerAccount(account).build();
    when(balances.computeBalance(account)).thenReturn(new BigDecimal("200.00"));
    when(client.score(any())).thenReturn(decision("allow"));
    var user = User.builder().id(7L).build();
    service.evaluateTransaction("debit-1", user, wallet, BigDecimal.TEN, "TRANSFER", null);
    service.evaluateTransaction("credit-1", user, wallet, BigDecimal.TEN, "deposit", null);
    var captured =
        org.mockito.ArgumentCaptor.forClass(
            com.mamadou.sutura.fraud.dto.TransactionEventRequest.class);
    verify(client, times(2)).score(captured.capture());
    assertThat(captured.getAllValues().get(0).metadata())
        .containsEntry("available_balance", new BigDecimal("200.00"));
    assertThat(captured.getAllValues().get(1).metadata()).doesNotContainKey("available_balance");
    verify(balances, times(1)).computeBalance(account);
  }

  @Test
  void persistedTransferSuppliesActualRecipientCustomerOnly() {
    var user = User.builder().id(7L).build();
    var wallet = Wallet.builder().id(9L).currency("GMD").build();
    when(client.score(any())).thenReturn(decision("allow"));
    when(transactions.findRecipientCustomerId(42L, 9L)).thenReturn(java.util.Optional.of(81L));
    service.evaluateTransaction("transfer-42", user, wallet, BigDecimal.TEN, "transfer", 42L);
    service.evaluateTransaction("deposit-43", user, wallet, BigDecimal.TEN, "deposit", 43L);
    var captured =
        org.mockito.ArgumentCaptor.forClass(
            com.mamadou.sutura.fraud.dto.TransactionEventRequest.class);
    verify(client, times(2)).score(captured.capture());
    assertThat(captured.getAllValues().get(0).metadata()).containsEntry("counterparty", "81");
    assertThat(captured.getAllValues().get(1).metadata()).doesNotContainKey("counterparty");
    verify(transactions, times(1)).findRecipientCustomerId(anyLong(), anyLong());
  }

  private FraudDecisionResponse decision(String value) {
    return new FraudDecisionResponse(
        "transfer-42", value, 0.7, List.of("risk explanation"), 1, null, Map.of());
  }
}
