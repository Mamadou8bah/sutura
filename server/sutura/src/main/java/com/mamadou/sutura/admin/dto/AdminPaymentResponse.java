package com.mamadou.sutura.admin.dto;

import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.transaction.enums.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminPaymentResponse(Long id, String reference, TransactionType type,
        TransactionStatus status, Long sourceWalletId, Long destinationWalletId,
        BigDecimal amount, String currency, String description, String failureReason,
        String sentinelRecommendation, LocalDateTime createdAt, LocalDateTime updatedAt,
        FraudSummary fraud) {
    public record FraudSummary(Long evaluationId, String decision, BigDecimal score, LocalDateTime evaluatedAt) {}
    public static AdminPaymentResponse from(Transaction t, FraudSummary fraud) {
        return new AdminPaymentResponse(t.getId(), t.getReference(), t.getType(), t.getStatus(),
                t.getSourceWallet()==null?null:t.getSourceWallet().getId(),
                t.getDestinationWallet()==null?null:t.getDestinationWallet().getId(),
                t.getAmount(),t.getCurrency(),t.getDescription(),t.getFailureReason(),
                t.getSentinelRecommendation(),t.getCreatedAt(),t.getUpdatedAt(),fraud);
    }
}
