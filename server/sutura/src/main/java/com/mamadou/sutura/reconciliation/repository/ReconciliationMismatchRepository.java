package com.mamadou.sutura.reconciliation.repository;

import com.mamadou.sutura.reconciliation.entity.ReconciliationMismatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReconciliationMismatchRepository extends JpaRepository<ReconciliationMismatch, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from ReconciliationMismatch m where m.id = :id")
    java.util.Optional<ReconciliationMismatch> findForResolution(@Param("id") Long id);

    @Query("SELECT m FROM ReconciliationMismatch m WHERE m.report.id = :reportId ORDER BY m.createdAt DESC")
    List<ReconciliationMismatch> findByReportId(@Param("reportId") Long reportId);

    @Query("SELECT m FROM ReconciliationMismatch m WHERE m.report.id = :reportId ORDER BY m.createdAt DESC")
    Page<ReconciliationMismatch> findByReportId(@Param("reportId") Long reportId, Pageable pageable);

    @Query("SELECT m FROM ReconciliationMismatch m WHERE m.report.id = :reportId AND m.resolved = false")
    List<ReconciliationMismatch> findUnresolvedByReportId(@Param("reportId") Long reportId);

    @Query("SELECT COUNT(m) FROM ReconciliationMismatch m WHERE m.report.id = :reportId AND m.resolved = false")
    long countUnresolvedByReportId(@Param("reportId") Long reportId);

    @Query("SELECT m FROM ReconciliationMismatch m WHERE m.mismatchType = :type ORDER BY m.variance DESC")
    List<ReconciliationMismatch> findByMismatchType(@Param("type") String type);

    @Query("SELECT m FROM ReconciliationMismatch m WHERE m.entityId = :entityId AND m.resolved = false")
    List<ReconciliationMismatch> findByEntityIdUnresolved(@Param("entityId") Long entityId);

    @Query("SELECT COUNT(m) FROM ReconciliationMismatch m WHERE m.resolved = false")
    long countAllUnresolved();
}
