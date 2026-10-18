package com.mamadou.sutura.kyc.onboarding;

import java.time.LocalDateTime;
import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface KycOnboardingRepository extends JpaRepository<KycOnboarding, Long> {
  @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select j from KycOnboarding j where j.userId=:id")
  Optional<KycOnboarding> findForUpdate(@Param("id") Long id);

  @Query(
      "select j.userId from KycOnboarding j where j.status='PENDING' and j.nextAttemptAt<=:now"
          + " order by j.nextAttemptAt,j.userId")
  List<Long> due(@Param("now") LocalDateTime now, Pageable page);
}
