package com.mamadou.sutura.transfer.service;

import com.mamadou.sutura.transfer.repository.TransferJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor @Slf4j
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
        name = "sutura.transfers.worker-enabled", havingValue = "true", matchIfMissing = true)
public class TransferJobWorker {
    private final TransferJobRepository jobs;
    private final TransferJobProcessor processor;
    private final com.mamadou.sutura.fraud.client.FraudDetectionClient sentinel;
    private final com.mamadou.sutura.fraud.config.FraudDetectionProperties properties;

    @org.springframework.context.annotation.Bean
    public org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler transferTaskScheduler() {
        var scheduler = new org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("transfer-worker-");
        return scheduler;
    }

    @Scheduled(fixedDelayString = "${sutura.transfers.worker-delay-ms:1000}", scheduler = "transferTaskScheduler")
    public void run() {
        var ready = jobs.findReady(PageRequest.of(0, 5));
        if (ready.isEmpty()) return;
        // Wake the service without holding the payer's database locks.
        if (properties.isEnabled() && (!properties.isConnected() || !sentinel.isHealthy())) {
            for (Long id : ready) processor.postpone(id);
            return;
        }
        for (Long id : ready) {
            try {
                processor.prepare(id);
                processor.process(id);
            } catch (RuntimeException failure) {
                log.warn("Background transfer {} rolled back ({})", id, failure.getClass().getSimpleName());
                try {
                    if (failure instanceof com.mamadou.sutura.transaction.exception.TransactionException
                            || failure instanceof com.mamadou.sutura.wallet.exception.WalletOperationException
                            || failure instanceof IllegalArgumentException) processor.fail(id);
                    else processor.postpone(id);
                }
                catch (RuntimeException recordingFailure) {
                    log.error("Could not persist background transfer {} outcome ({})", id,
                            recordingFailure.getClass().getSimpleName());
                }
            }
        }
    }
}
