package com.mamadou.sutura.reconciliation.repository;

import com.mamadou.sutura.reconciliation.entity.ReconciliationReport;
import com.mamadou.sutura.reconciliation.enums.ReconciliationStatus;
import com.mamadou.sutura.reconciliation.enums.ReconciliationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReconciliationReportRepository extends JpaRepository<ReconciliationReport, Long> {
    @org.springframework.data.jpa.repository.Modifying
    @Query("update ReconciliationReport r set r.mismatchesResolved = r.mismatchesResolved + 1, r.updatedAt = CURRENT_TIMESTAMP where r.id = :id")
    void incrementResolved(@Param("id") Long id);

    @Query("SELECT r FROM ReconciliationReport r WHERE r.reconciliationType = :type ORDER BY r.startedAt DESC")
    List<ReconciliationReport> findByTypeOrderedRecent(@Param("type") ReconciliationType type);

    @Query("SELECT r FROM ReconciliationReport r WHERE r.status = :status ORDER BY r.startedAt DESC")
    Page<ReconciliationReport> findByStatus(@Param("status") ReconciliationStatus status, Pageable pageable);

    @Query("SELECT r FROM ReconciliationReport r WHERE r.reconciliationType = :type AND r.status = :status ORDER BY r.startedAt DESC")
    List<ReconciliationReport> findByTypeAndStatus(
        @Param("type") ReconciliationType type,
        @Param("status") ReconciliationStatus status
    );

    @Query("SELECT r FROM ReconciliationReport r WHERE r.startedAt BETWEEN :start AND :end ORDER BY r.startedAt DESC")
    List<ReconciliationReport> findByDateRange(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    @Query("SELECT r FROM ReconciliationReport r WHERE r.mismatchesFound > 0 AND r.status IN ('COMPLETED_WITH_MISMATCHES', 'RESOLVED') ORDER BY r.mismatchesFound DESC")
    List<ReconciliationReport> findReportsWithMismatches();

    @Query("SELECT COUNT(r) FROM ReconciliationReport r WHERE r.status = :status")
    long countByStatus(@Param("status") ReconciliationStatus status);

    Optional<ReconciliationReport> findFirstByReconciliationTypeOrderByStartedAtDesc(ReconciliationType type);
}
