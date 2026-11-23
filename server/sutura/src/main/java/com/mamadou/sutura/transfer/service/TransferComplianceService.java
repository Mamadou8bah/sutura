package com.mamadou.sutura.transfer.service;

import com.mamadou.sutura.fraud.dto.FraudDecisionResponse;
import com.mamadou.sutura.fraud.exception.FraudBlockedException;
import com.mamadou.sutura.fraud.service.FraudDetectionService;
import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.service.TransactionService;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TransferComplianceService {
    private final FraudDetectionService fraudDetectionService;
    private final TransactionRepository repository;
    private final TransactionService transactionService;
    private final com.mamadou.sutura.transfer.repository.TransferJobRepository jobs;

    /** Return true only when a validated allow result permits execution. */
    public boolean assess(Transaction transaction) {
        FraudDecisionResponse decision;
        try {
            decision = fraudDetectionService.evaluateTransaction(transaction.getReference(),
                    transaction.getInitiatedBy(), transaction.getSourceWallet(), transaction.getAmount(),
                    "transfer", transaction.getId());
        } catch (com.mamadou.sutura.fraud.exception.SentinelUnavailableException pending) {
            transaction.setFailureReason("Waiting for Sentinel; processing will continue automatically");
            repository.save(transaction);
            if (jobs.findById(transaction.getId()).isEmpty())
                jobs.save(new com.mamadou.sutura.transfer.entity.TransferJob(transaction.getId()));
            return false;
        } catch (FraudBlockedException e) {
            transactionService.markFailed(transaction, "Sentinel rejected this transfer");
            return false;
        }
        if (decision == null) {
            transactionService.markFailed(transaction, "A Sentinel decision is required");
            return false;
        }
        transaction.setSentinelRecommendation(decision.decision());
        transaction.setFailureReason(null);
        if (decision.features() != null) {
            Object txId = decision.features().get("sentinelTransactionId");
            Object caseId = decision.features().get("sentinelCaseId");
            transaction.setSentinelTransactionId(txId == null ? null : txId.toString());
            transaction.setSentinelCaseId(caseId == null ? null : caseId.toString());
        }
        if ("allow".equalsIgnoreCase(decision.decision())) {
            repository.save(transaction);
            return true;
        }
        if ("review".equalsIgnoreCase(decision.decision()) && transaction.getSentinelCaseId() != null) {
            transaction.setFailureReason("Pending Sentinel case review");
            repository.save(transaction);
            return false;
        }
        transactionService.markFailed(transaction, "Sentinel rejected the transfer or returned an incomplete review");
        return false;
    }
}
