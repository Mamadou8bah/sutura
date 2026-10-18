package com.mamadou.sutura.auth.recovery;

import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface RecoveryChallengeRepository extends JpaRepository<RecoveryChallenge, String> {
  @Query("select c.userId from RecoveryChallenge c where c.id = :id")
  Optional<Long> findOwnerId(@Param("id") String id);

  @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from RecoveryChallenge c where c.id = :id")
  Optional<RecoveryChallenge> findForUpdate(@Param("id") String id);
}
