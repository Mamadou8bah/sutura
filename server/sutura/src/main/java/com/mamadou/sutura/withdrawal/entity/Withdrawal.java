package com.mamadou.sutura.withdrawal.entity;

import com.mamadou.sutura.common.auditing.AuditableEntity;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.wallet.entity.Wallet;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Represents a withdrawal transaction - money being removed from a wallet
 * Supports both agent-initiated withdrawals (on behalf of user) and self-service withdrawals
 */
@Entity
@Table(name = "withdrawals", indexes = {
        @Index(name = "idx_withdrawals_wallet", columnList = "wallet_id"),
        @Index(name = "idx_withdrawals_user", columnList = "user_id"),
        @Index(name = "idx_withdrawals_agent", columnList = "agent_id"),
        @Index(name = "idx_withdrawals_status", columnList = "status"),
        @Index(name = "idx_withdrawals_type", columnList = "withdrawal_type"),
        @Index(name = "idx_withdrawals_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Withdrawal extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Agent who approved/processed the withdrawal (null for self-service)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id")
    private User agent;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private WithdrawalType withdrawalType;  // AGENT or SELF

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private WithdrawalStatus status;  // PENDING, APPROVED, PROCESSING, COMPLETED, FAILED, REJECTED

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal feesAmount = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    private String currency;

    /**
     * Withdrawal method - where the money goes
     */
    @Column(length = 50)
    private String withdrawalMethod;  // mobile_money, bank_account, card, etc

    /**
     * Recipient phone number (for mobile money)
     */
    @Column(length = 20)
    private String phoneNumber;

    /**
     * Bank account details (for bank transfers)
     */
    @Column(length = 255)
    private String bankAccount;

    /**
     * Reference to the payment provider
     */
    @Column(length = 100)
    private String externalPaymentId;

    /**
     * Your internal transaction reference
     */
    @Column(length = 100)
    private String reference;

    /**
     * Optional idempotency key used when creating upstream payouts
     */
    @Column(length = 128, unique = true)
    private String idempotencyKey;

    @Column(length = 64)
    private String requestHash;

    @Column(length = 80)
    private String reservationTraceId;
    @Column(length = 80)
    private String settlementTraceId;
    @Column(length = 80)
    private String releaseTraceId;

    /**
     * Description of the withdrawal
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Reason if withdrawal was rejected/failed
     */
    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    /**
     * When the withdrawal was approved (by agent or auto-approved for self)
     */
    private LocalDateTime approvedAt;

    /**
     * When the withdrawal was completed
     */
    private LocalDateTime completedAt;

    @Column(length = 64)
    private String cashQrHash;
    private java.time.Instant cashQrExpiresAt;
    @Column(length = 64)
    private String cashClaimHash;
    private java.time.Instant cashClaimExpiresAt;
    private Long cashClaimAgentId;

    @PrePersist
    public void onCreate() {
        super.onCreate();
        if (status == null) {
            status = WithdrawalStatus.PENDING;
        }
        if (feesAmount == null) {
            feesAmount = BigDecimal.ZERO;
        }
    }

    public enum WithdrawalType {
        /**
         * Agent processes withdrawal on behalf of the user
         */
        AGENT,
        /**
         * User initiates withdrawal for themselves (self-service)
         */
        SELF
    }

    public enum WithdrawalStatus {
        PENDING_REVIEW,
        AWAITING_AGENT, // Merchant intent created; agent must scan QR and complete
        PENDING,      // Awaiting approval
        APPROVED,     // Approved by agent or auto-approved
        PROCESSING,   // Payment processing
        COMPLETED,    // Successfully withdrawn
        FAILED,       // Withdrawal failed
        REJECTED      // Rejected by agent
    }
}
