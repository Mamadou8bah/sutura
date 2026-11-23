package com.mamadou.sutura.transfer;

import com.mamadou.sutura.fraud.dto.FraudDecisionResponse;
import com.mamadou.sutura.fraud.exception.FraudBlockedException;
import com.mamadou.sutura.fraud.service.FraudDetectionService;
import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.transaction.service.TransactionService;
import com.mamadou.sutura.transfer.service.TransferComplianceService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.wallet.entity.Wallet;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class TransferComplianceTest {
    private final FraudDetectionService fraud = mock(FraudDetectionService.class);
    private final TransactionRepository repository = mock(TransactionRepository.class);
    private final TransactionService transactions = mock(TransactionService.class);
    private final com.mamadou.sutura.transfer.repository.TransferJobRepository jobs = mock(com.mamadou.sutura.transfer.repository.TransferJobRepository.class);
    private final TransferComplianceService service = new TransferComplianceService(fraud, repository, transactions,
        jobs);
    private Transaction tx;

    @BeforeEach void setup() {
        tx = Transaction.builder().id(42L).reference("xfer-42").status(TransactionStatus.PENDING)
                .initiatedBy(User.builder().id(7).build()).sourceWallet(Wallet.builder().id(9L).build())
                .amount(BigDecimal.TEN).build();
    }

    @Test void reviewIsStoredWithCaseAndCannotExecute() {
        when(fraud.evaluateTransaction(any(), any(), any(), any(), any(), any())).thenReturn(decision("review", true));
        assertThat(service.assess(tx)).isFalse();
        assertThat(tx.getStatus()).isEqualTo(TransactionStatus.PENDING);
        assertThat(tx.getSentinelCaseId()).isEqualTo("case-9");
        verify(repository).save(tx);
        verify(transactions, never()).markCompleted(any(), any());
    }

    @Test void allowPermitsExecution() {
        when(fraud.evaluateTransaction(any(), any(), any(), any(), any(), any())).thenReturn(decision("allow", false));
        assertThat(service.assess(tx)).isTrue();
    }

    @Test void blockAndIncompleteReviewArePersistedAsFailed() {
        when(fraud.evaluateTransaction(any(), any(), any(), any(), any(), any())).thenReturn(decision("block", false));
        assertThat(service.assess(tx)).isFalse();
        verify(transactions).markFailed(eq(tx), anyString());
    }

    @Test void anExplicitBlockExceptionCannotProceed() {
        when(fraud.evaluateTransaction(any(), any(), any(), any(), any(), any()))
                .thenThrow(new FraudBlockedException("blocked", 1, "block"));
        assertThat(service.assess(tx)).isFalse();
        verify(transactions).markFailed(tx, "Sentinel rejected this transfer");
    }

    @Test void infrastructureFailureKeepsThePaymentPendingAndQueuesItsRetry() {
        when(fraud.evaluateTransaction(any(),any(),any(),any(),any(),any()))
            .thenThrow(new com.mamadou.sutura.fraud.exception.SentinelUnavailableException("Sleeping"));
        assertThat(service.assess(tx)).isFalse();
        assertThat(tx.getStatus()).isEqualTo(TransactionStatus.PENDING);
        assertThat(tx.getSentinelRecommendation()).isNull();
        verify(jobs).save(any(com.mamadou.sutura.transfer.entity.TransferJob.class));
        verify(transactions,never()).markFailed(any(),any());
    }

    private FraudDecisionResponse decision(String value, boolean withCase) {
        return new FraudDecisionResponse("xfer-42", value, 0.7, List.of("risk"), 1, null,
                withCase ? Map.of("sentinelCaseId", "case-9", "sentinelTransactionId", "sentinel-42")
                         : Map.of("sentinelTransactionId", "sentinel-42"));
    }
}
