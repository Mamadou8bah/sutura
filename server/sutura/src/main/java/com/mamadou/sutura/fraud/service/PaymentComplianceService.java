package com.mamadou.sutura.fraud.service;

import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.transaction.service.TransactionService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.wallet.entity.Wallet;
import com.mamadou.sutura.fraud.exception.FraudBlockedException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PaymentComplianceService {
    private final FraudDetectionService fraud;
    private final TransactionRepository transactions;
    private final TransactionService transactionService;

    public boolean assess(Transaction tx, User customer, Wallet wallet, String operation) {
        if (tx.getStatus() != TransactionStatus.PENDING) return false;
        if ("review".equalsIgnoreCase(tx.getSentinelRecommendation())) return false;
        if (tx.getSentinelApprovedAt() != null) {
            if (tx.getSentinelApprovedAt().isBefore(LocalDateTime.now().minusMinutes(15))) {
                transactionService.markFailed(tx, "Case approval expired; create a new operation");
                return false;
            }
            return "allow".equalsIgnoreCase(tx.getSentinelRecommendation());
        }
        String reference = "settlement:" + tx.getReference();
        tx.setSentinelCustomerId(customer.getId());
        tx.setSentinelExternalReference(reference);
        try {
            var result = fraud.evaluateTransaction(reference, customer, wallet, tx.getAmount(), operation, tx.getId());
            if (result == null) {
                transactionService.markFailed(tx, "Sentinel decision is required"); return false;
            }
            tx.setSentinelRecommendation(result.decision());
            tx.setFailureReason(null);
            if (result.features() != null) {
                Object caseId = result.features().get("sentinelCaseId");
                Object scoreId = result.features().get("sentinelTransactionId");
                tx.setSentinelCaseId(caseId == null ? null : caseId.toString());
                tx.setSentinelTransactionId(scoreId == null ? null : scoreId.toString());
            }
            if ("allow".equalsIgnoreCase(result.decision())) { transactions.save(tx); return true; }
            if ("review".equalsIgnoreCase(result.decision()) && tx.getSentinelCaseId() != null
                    && tx.getSentinelTransactionId() != null) {
                tx.setFailureReason("Pending Sentinel case review"); transactions.save(tx); return false;
            }
            transactionService.markFailed(tx, "Sentinel blocked the operation or returned incomplete review");
        } catch (com.mamadou.sutura.fraud.exception.SentinelUnavailableException pending) {
            tx.setFailureReason("Waiting for Sentinel; processing will continue automatically");
            transactions.save(tx);
        } catch (FraudBlockedException ex) {
            transactionService.markFailed(tx, "Sentinel rejected this operation");
        }
        return false;
    }
}
