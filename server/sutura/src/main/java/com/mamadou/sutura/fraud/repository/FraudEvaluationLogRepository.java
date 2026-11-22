package com.mamadou.sutura.fraud.repository;

import com.mamadou.sutura.fraud.entity.FraudEvaluationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FraudEvaluationLogRepository extends JpaRepository<FraudEvaluationLog, Long> {

    interface Summary {
        Long getId();
        Long getPersistedTransactionId();
        String getTransactionReference();
        String getDecision();
        java.math.BigDecimal getScore();
        java.time.LocalDateTime getCreatedAt();
    }

    @Query("""
        select l.id as id, l.persistedTransactionId as persistedTransactionId,
          l.transactionReference as transactionReference, l.decision as decision,
          l.score as score, l.createdAt as createdAt from FraudEvaluationLog l
        where (l.persistedTransactionId in :ids or (l.persistedTransactionId is null and l.transactionReference in :refs))
        and l.id = (select max(n.id) from FraudEvaluationLog n where
          (l.persistedTransactionId is not null and n.persistedTransactionId = l.persistedTransactionId)
          or (l.persistedTransactionId is null and n.persistedTransactionId is null and n.transactionReference = l.transactionReference))
        order by l.id asc
        """)
    java.util.List<Summary> latestForPayments(@org.springframework.data.repository.query.Param("ids") java.util.List<Long> ids,
        @org.springframework.data.repository.query.Param("refs") java.util.List<String> refs);

    @Query("""
        select l from FraudEvaluationLog l where l.persistedTransactionId = :id
          or (l.persistedTransactionId is null and l.transactionReference = :ref) order by l.id desc
        """)
    Page<FraudEvaluationLog> paymentHistory(@org.springframework.data.repository.query.Param("id") Long id,
        @org.springframework.data.repository.query.Param("ref") String reference, Pageable pageable);

    Page<FraudEvaluationLog> findByWalletIdOrderByCreatedAtDesc(Long walletId, Pageable pageable);

    @Query("""
        SELECT COUNT(l) FROM FraudEvaluationLog l
        """)
    long countAll();

    @Query("""
        SELECT COUNT(l) FROM FraudEvaluationLog l WHERE l.confirmedFraud IS NOT NULL
        """)
    long countLabeled();

    @Query("""
        SELECT COUNT(l) FROM FraudEvaluationLog l WHERE l.confirmedFraud = true
        """)
    long countConfirmedFraud();
}
