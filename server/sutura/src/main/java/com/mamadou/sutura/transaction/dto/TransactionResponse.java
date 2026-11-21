package com.mamadou.sutura.transaction.dto;

import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.transaction.enums.TransactionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class TransactionResponse {
    private Long id;
    private String reference;
    private TransactionType type;
    private TransactionStatus status;
    private Long sourceWalletId;
    private Long destinationWalletId;
    private BigDecimal amount;
    private String currency;
    private String description;
    private String sentinelRecommendation;
    private String failureReason;
    private boolean reversible;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
