package com.mamadou.sutura.reconciliation.entity;

import com.mamadou.sutura.common.auditing.AuditableEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "reconciliation_mismatches", indexes = {
    @Index(name = "idx_report_id", columnList = "report_id"),
    @Index(name = "idx_resolved", columnList = "resolved"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReconciliationMismatch extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private ReconciliationReport report;

    @Column(nullable = false)
    private String mismatchType;

    @Column(nullable = false)
    private Long entityId;

    @Column(nullable = false)
    private String entityType;

    @Column(columnDefinition = "TEXT")
    private String expectedValue;

    @Column(columnDefinition = "TEXT")
    private String actualValue;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal variance;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private boolean resolved;

    @Column(columnDefinition = "TEXT")
    private String resolutionAction;

    private LocalDateTime resolvedAt;

    private String resolvedBy;

    @PrePersist
    protected void onCreate() {
        super.onCreate();
        if (this.resolved == false) {
            this.resolved = false;
        }
        if (this.variance == null) {
            this.variance = BigDecimal.ZERO;
        }
    }
}
