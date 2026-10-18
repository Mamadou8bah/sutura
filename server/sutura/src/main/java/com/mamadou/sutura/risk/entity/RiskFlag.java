package com.mamadou.sutura.risk.entity;

import com.mamadou.sutura.common.auditing.AuditableEntity;
import com.mamadou.sutura.risk.enums.RiskLevel;
import com.mamadou.sutura.risk.enums.RiskRuleType;
import com.mamadou.sutura.wallet.entity.Wallet;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "risk_flags", indexes = {
    @Index(name = "idx_wallet_id", columnList = "wallet_id"),
    @Index(name = "idx_risk_level", columnList = "risk_level"),
    @Index(name = "idx_risk_flags_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskFlag extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @Column(nullable = false)
    private Long transactionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RiskLevel riskLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RiskRuleType triggeringRule;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal riskScore;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false)
    private boolean resolved;

    private String resolutionAction;

    @Column(nullable = false, updatable = false)
    private LocalDateTime flaggedAt;

    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        super.onCreate();
        if (this.flaggedAt == null) {
            this.flaggedAt = LocalDateTime.now();
        }
        if (this.resolved == false) {
            this.resolved = false;
        }
        if (this.riskScore == null) {
            this.riskScore = BigDecimal.ZERO;
        }
    }
}
