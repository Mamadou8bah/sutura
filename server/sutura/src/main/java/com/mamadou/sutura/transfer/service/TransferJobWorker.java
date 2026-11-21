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

    @org.springframework.context.annotation.Bean
    public org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler transferTaskScheduler() {
        var scheduler = new org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("transfer-worker-");
        return scheduler;
    }

    @Scheduled(fixedDelayString = "${sutura.transfers.worker-delay-ms:1000}", scheduler = "transferTaskScheduler")
    public void run() {
        for (Long id : jobs.findReady(PageRequest.of(0, 5))) {
            try {
                processor.process(id);
            } catch (RuntimeException failure) {
                log.warn("Background transfer {} rolled back ({})", id, failure.getClass().getSimpleName());
                try { processor.fail(id); }
                catch (RuntimeException recordingFailure) {
                    log.error("Could not persist background transfer {} outcome ({})", id,
                            recordingFailure.getClass().getSimpleName());
                }
            }
        }
    }
}
