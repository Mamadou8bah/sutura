package com.mamadou.sutura.transfer.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Durable work item; committed with the pending transfer and its idempotency key. */
@Entity
@Table(name = "transfer_jobs")
@Getter @Setter @NoArgsConstructor
public class TransferJob {
    @Id
    private Long transactionId;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    private Instant finishedAt;
    @Column(nullable = false)
    private Instant nextAttemptAt = Instant.now();
    @Column(nullable = false)
    private int attempts;

    public void postpone() {
        attempts++;
        nextAttemptAt = Instant.now().plusSeconds(Math.min(120, 5L << Math.min(5, attempts - 1)));
    }

    public TransferJob(Long transactionId) { this.transactionId = transactionId; }
}
