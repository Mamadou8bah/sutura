package com.mamadou.sutura.audit.repository;

import com.mamadou.sutura.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    long countBySuccessFalse();

    @Query("SELECT a FROM AuditLog a WHERE a.actorId = :actorId ORDER BY a.timestamp DESC")
    List<AuditLog> findByActorId(@Param("actorId") Long actorId);

    @Query("SELECT a FROM AuditLog a WHERE a.actorId = :actorId ORDER BY a.timestamp DESC")
    Page<AuditLog> findByActorId(@Param("actorId") Long actorId, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.actionType = :actionType ORDER BY a.timestamp DESC")
    List<AuditLog> findByActionType(@Param("actionType") String actionType);

    @Query("SELECT a FROM AuditLog a WHERE a.entityType = :entityType AND a.entityId = :entityId ORDER BY a.timestamp DESC")
    List<AuditLog> findByEntityTypeAndEntityId(
        @Param("entityType") String entityType,
        @Param("entityId") Long entityId
    );

    @Query("SELECT a FROM AuditLog a WHERE a.timestamp BETWEEN :start AND :end ORDER BY a.timestamp DESC")
    List<AuditLog> findByDateRange(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    @Query("SELECT a FROM AuditLog a WHERE a.success = false ORDER BY a.timestamp DESC")
    List<AuditLog> findFailedOperations();

    @Query("SELECT a FROM AuditLog a WHERE a.actorId = :actorId AND a.timestamp BETWEEN :start AND :end ORDER BY a.timestamp DESC")
    List<AuditLog> findByActorAndDateRange(
        @Param("actorId") Long actorId,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.actionType = :actionType AND a.timestamp >= :since")
    long countRecentByActionType(@Param("actionType") String actionType, @Param("since") LocalDateTime since);
}
