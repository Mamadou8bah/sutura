package com.mamadou.sutura.operations;

import java.time.LocalDateTime;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface OperationalAlertRepository extends JpaRepository<OperationalAlert, Long> {
  boolean existsByEventKey(String eventKey);

  @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from OperationalAlert a where a.id = :id")
  Optional<OperationalAlert> findForDelivery(@Param("id") Long id);

  List<OperationalAlert> findTop20ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
      String status, LocalDateTime now);

  long countByStatus(String status);
}
