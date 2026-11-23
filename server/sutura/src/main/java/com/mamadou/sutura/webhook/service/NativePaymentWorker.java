package com.mamadou.sutura.webhook.service;

import com.mamadou.sutura.webhook.repository.WebhookEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.data.domain.PageRequest;

@Component
@RequiredArgsConstructor
@Slf4j
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="sutura.payments.incoming-worker-enabled",havingValue="true",matchIfMissing=true)
public class NativePaymentWorker {
    private final WebhookEventRepository events;
    private final NativePaymentInbox inbox;

    @Scheduled(fixedDelayString="${sutura.payments.incoming-worker-delay-ms:3000}")
    public void run() {
        for (Long id : events.findNativeReady(PageRequest.of(0,5))) {
            try { inbox.prepare(id); inbox.process(id); }
            catch (com.mamadou.sutura.fraud.exception.SentinelUnavailableException unavailable) { inbox.failed(id,true); }
            catch (RuntimeException failure) {
                log.warn("Incoming payment receipt {} needs reconciliation ({})",id,failure.getClass().getSimpleName());
                inbox.failed(id, !(failure instanceof IllegalArgumentException || failure instanceof SecurityException
                    || failure instanceof com.mamadou.sutura.wallet.exception.WalletOperationException));
            }
        }
    }
}
