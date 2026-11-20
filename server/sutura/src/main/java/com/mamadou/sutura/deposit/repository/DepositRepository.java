package com.mamadou.sutura.deposit.repository;

import com.mamadou.sutura.deposit.entity.Deposit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepositRepository extends JpaRepository<Deposit, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"wallet", "user"})
    List<Deposit> findTop100ByAgentIdOrderByCreatedAtDesc(Long agentId);
    Optional<Deposit> findByReferenceIgnoreCase(String reference);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select d from Deposit d where lower(d.reference) = lower(:reference)")
    Optional<Deposit> findForCompletion(String reference);
    Optional<Deposit> findByIdempotencyKey(String key);
    List<Deposit> findByUserIdOrderByCreatedAtDesc(Long userId);
}
