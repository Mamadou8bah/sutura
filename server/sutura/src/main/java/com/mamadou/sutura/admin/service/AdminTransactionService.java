package com.mamadou.sutura.admin.service;

import com.mamadou.sutura.audit.entity.AuditLog;
import com.mamadou.sutura.audit.service.AuditLogService;
import com.mamadou.sutura.audit.service.AuditTrailBuilder;
import com.mamadou.sutura.transaction.dto.ReversalRequest;
import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.transaction.enums.TransactionType;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.transfer.service.TransferReversalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminTransactionService {

    private final TransactionRepository transactionRepository;
    private final TransferReversalService transferReversalService;
    private final AuditLogService auditLogService;

    @Transactional
    public void reverseTransaction(Long transactionId, String reason, boolean refundToWallet, Long adminId, String adminEmail) {
        Transaction transaction = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new RuntimeException("Transaction not found: " + transactionId));

        TransactionStatus previousStatus = transaction.getStatus();

        if (transaction.getType() == TransactionType.TRANSFER && refundToWallet) {
            ReversalRequest reversalRequest = new ReversalRequest();
            reversalRequest.setReason(reason != null ? reason : "Admin reversal");
            transferReversalService.reverseAsAdmin(transactionId, reversalRequest);
        } else {
            transaction.setStatus(TransactionStatus.REVERSED);
            transactionRepository.save(transaction);
        }

        log.warn("Transaction {} reversed by admin {}: {}", transactionId, adminId, reason);

        AuditLog auditLog = AuditTrailBuilder.create()
            .actor(adminId, adminEmail)
            .action("REVERSE_TRANSACTION")
            .entity("TRANSACTION", transactionId)
            .previousState(previousStatus)
            .newState(TransactionStatus.REVERSED)
            .changeDescription(reason + (refundToWallet ? " (with refund)" : ""))
            .build();

        auditLogService.createLog(auditLog);
    }

    public long getFailedTransactionCount() {
        return transactionRepository.countByStatus(TransactionStatus.FAILED);
    }

    public long getPendingTransactionCount() {
        return transactionRepository.countByStatus(TransactionStatus.PENDING);
    }
}
