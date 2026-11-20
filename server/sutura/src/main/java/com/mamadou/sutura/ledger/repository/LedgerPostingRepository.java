package com.mamadou.sutura.ledger.repository;

import com.mamadou.sutura.ledger.entity.LedgerPosting;
import com.mamadou.sutura.ledger.enums.LedgerPostingSide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface LedgerPostingRepository extends JpaRepository<LedgerPosting, Long> {
    List<LedgerPosting> findByTraceIdOrderByIdAsc(String traceId);
    List<LedgerPosting> findByAccount_CodeOrderByPostedAtDesc(String accountCode);
    boolean existsByTraceId(String traceId);

    @Query("""
            select coalesce(sum(p.amount), 0)
            from LedgerPosting p
            where p.account.id = :accountId and p.side = :side
            """)
    BigDecimal sumByAccountIdAndSide(@Param("accountId") Long accountId, @Param("side") LedgerPostingSide side);
    @Query("""
            select coalesce(sum(case when p.side = :creditSide then p.amount else -p.amount end), 0)
            from LedgerPosting p where p.account.id = :accountId
            """)
    BigDecimal netCreditsByAccountId(@Param("accountId") Long accountId,
                                    @Param("creditSide") LedgerPostingSide creditSide);
}
