package com.mamadou.sutura.reconciliation.entity;

import com.mamadou.sutura.common.auditing.AuditableEntity;
import com.mamadou.sutura.reconciliation.enums.ReconciliationStatus;
import com.mamadou.sutura.reconciliation.enums.ReconciliationType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reconciliation_reports", indexes = {
    @Index(name = "idx_reconciliation_type", columnList = "reconciliation_type"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_started_at", columnList = "started_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReconciliationReport extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReconciliationType reconciliationType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReconciliationStatus status;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    @Column(nullable = false)
    private long totalRecordsChecked;

    @Column(nullable = false)
    private long mismatchesFound;

    private long mismatchesResolved;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String errorDetails;

    private String triggeredBy;

    private boolean automated;

    @PrePersist
    protected void onCreate() {
        super.onCreate();
        if (this.startedAt == null) {
            this.startedAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = ReconciliationStatus.PENDING;
        }
        if (this.totalRecordsChecked == 0) {
            this.totalRecordsChecked = 0;
        }
        if (this.mismatchesFound == 0) {
            this.mismatchesFound = 0;
        }
        if (this.mismatchesResolved == 0) {
            this.mismatchesResolved = 0;
        }
    }
}
