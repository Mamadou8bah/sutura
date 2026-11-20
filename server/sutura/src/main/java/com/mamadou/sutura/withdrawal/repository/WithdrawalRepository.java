package com.mamadou.sutura.withdrawal.repository;

import com.mamadou.sutura.withdrawal.entity.Withdrawal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WithdrawalRepository extends JpaRepository<Withdrawal, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"wallet", "user"})
    List<Withdrawal> findTop100ByAgentIdOrderByCreatedAtDesc(Long agentId);
    Optional<Withdrawal> findByReferenceIgnoreCase(String reference);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select w from Withdrawal w where lower(w.reference) = lower(:reference)")
    Optional<Withdrawal> findForCompletion(String reference);
    Optional<Withdrawal> findByIdempotencyKey(String key);
    List<Withdrawal> findTop50ByStatusAndWithdrawalMethodIsNotNullOrderByCreatedAtAsc(Withdrawal.WithdrawalStatus status);
    List<Withdrawal> findByUserIdOrderByCreatedAtDesc(Long userId);
}
