package com.mamadou.sutura.transfer.service;

import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.transaction.service.TransactionService;
import com.mamadou.sutura.transfer.repository.TransferJobRepository;
import com.mamadou.sutura.user.repository.UserRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TransferJobProcessor {
    private final TransferJobRepository jobs;
    private final TransactionRepository transactions;
    private final UserRepository users;
    private final TransferValidationService validation;
    private final TransferComplianceService compliance;
    private final TransferExecutionService execution;
    private final TransactionService transactionService;
    private final com.mamadou.sutura.fraud.service.FraudDetectionService fraud;

    @Transactional
    public void prepare(Long id) {
        var job = jobs.findForUpdate(id).orElseThrow();
        if (job.getFinishedAt() != null || job.getNextAttemptAt().isAfter(Instant.now())) return;
        var tx = transactions.findById(id).orElseThrow();
        if (tx.getStatus() == TransactionStatus.PENDING && tx.getSentinelRecommendation() == null)
            fraud.prepareRequest(tx.getReference(), tx.getInitiatedBy(), tx.getSourceWallet(), tx.getAmount(), "transfer", tx.getId());
    }

    @Transactional
    public void process(Long id) {
        var job = jobs.findForUpdate(id).orElseThrow();
        if (job.getFinishedAt() != null) return;
        if (job.getNextAttemptAt().isAfter(Instant.now())) return;
        var candidate = transactions.findById(id).orElseThrow();
        // Use the same owner -> transaction -> wallet lock order as case decisions.
        users.findForKycUpdate(candidate.getInitiatedBy().getId()).orElseThrow();
        var transaction = transactions.findForUpdateById(id).orElseThrow();
        if (transaction.getStatus() == TransactionStatus.PENDING
                && transaction.getSentinelRecommendation() == null) {
            validation.validatePending(transaction);
            if (compliance.assess(transaction)) execution.executePending(transaction);
        }
        if (transaction.getStatus() == TransactionStatus.PENDING && transaction.getSentinelRecommendation() == null) {
            job.postpone(); jobs.save(job); return;
        }
        // A review remains PENDING for the existing case-decision workflow.
        // Completion, ledger postings and job acknowledgement commit atomically.
        job.setFinishedAt(Instant.now());
        jobs.save(job);
    }

    @Transactional
    public void postpone(Long id) {
        var job = jobs.findForUpdate(id).orElseThrow();
        if (job.getFinishedAt() == null) { job.postpone(); jobs.save(job); }
    }

    /** Called in a fresh transaction only after processing/ledger writes have rolled back. */
    @Transactional
    public void fail(Long id) {
        var job = jobs.findForUpdate(id).orElseThrow();
        if (job.getFinishedAt() != null) return;
        var transaction = transactions.findForUpdateById(id).orElseThrow();
        if (transaction.getStatus() == TransactionStatus.PENDING
                && transaction.getSentinelRecommendation() == null) {
            transactionService.markFailed(transaction,
                    "Transfer could not complete. No money was sent. Check account status, balance and limits.");
        }
        job.setFinishedAt(Instant.now());
        jobs.save(job);
    }
}
