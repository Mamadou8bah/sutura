package com.mamadou.sutura.transfer.repository;

import com.mamadou.sutura.transfer.entity.TransferJob;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface TransferJobRepository extends JpaRepository<TransferJob, Long> {
    @Query("select j.transactionId from TransferJob j where j.finishedAt is null and j.nextAttemptAt <= CURRENT_TIMESTAMP order by j.nextAttemptAt, j.transactionId")
    List<Long> findReady(Pageable page);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from TransferJob j where j.transactionId = :id")
    Optional<TransferJob> findForUpdate(@Param("id") Long id);
}
