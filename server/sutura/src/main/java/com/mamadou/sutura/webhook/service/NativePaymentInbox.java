package com.mamadou.sutura.webhook.service;

import com.mamadou.sutura.webhook.entity.WebhookEvent;
import com.mamadou.sutura.webhook.repository.WebhookEventRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NativePaymentInbox {
    private final WebhookEventRepository events;
    private final ModemPayWebhookService provider;
    private final com.mamadou.sutura.deposit.repository.DepositRepository deposits;
    private final com.mamadou.sutura.transaction.repository.TransactionRepository transactions;
    private final com.mamadou.sutura.fraud.service.FraudDetectionService fraud;

    @Transactional
    public void prepare(Long id) {
        var event = events.findForUpdate(id).orElseThrow();
        if (!"MODEMPAY_NATIVE".equals(event.getProvider()) || !java.util.Set.of("RECEIVED","RETRY").contains(event.getStatus())
                || !"charge.succeeded".equals(event.getEventType()) || event.getNextAttemptAt().isAfter(LocalDateTime.now())) return;
        var deposit = deposits.findByReferenceIgnoreCase(event.getExternalReference()).orElseThrow();
        var tx = transactions.findByReference(deposit.getReference()).orElseThrow();
        if (tx.getStatus() == com.mamadou.sutura.transaction.enums.TransactionStatus.PENDING && tx.getSentinelRecommendation() == null)
            fraud.prepareRequest("settlement:" + tx.getReference(), deposit.getUser(), deposit.getWallet(), deposit.getAmount(), "DEPOSIT", tx.getId());
    }

    /** Commit authenticated evidence before acknowledging the provider. No scoring on this request. */
    @Transactional
    public void accept(String raw, String signature) {
        var payload = provider.verifyAndRead(raw, signature);
        String id;
        try { id = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
        if (events.findByProviderAndExternalEventId("MODEMPAY_NATIVE", id).isPresent()) return;
        String reference = payload.getData().getReference();
        boolean relevant = reference != null && !reference.isBlank()
            && (!payload.getEvent().startsWith("charge.") || deposits.findByReferenceIgnoreCase(reference).isPresent());
        events.save(WebhookEvent.builder().provider("MODEMPAY_NATIVE").externalEventId(id)
            .eventType(payload.getEvent()).externalReference(reference)
            .status(relevant ? "RECEIVED" : "IGNORED").rawPayload(raw).attempts(0)
            .failureReason(relevant ? null : "No matching Sutura operation").build());
    }

    @Transactional
    public void process(Long id) {
        var event = events.findForUpdate(id).orElseThrow();
        if (!"MODEMPAY_NATIVE".equals(event.getProvider())) throw new IllegalArgumentException("Not a native payment receipt");
        if ("PROCESSED".equals(event.getStatus()) || "IGNORED".equals(event.getStatus())) return;
        if (event.getNextAttemptAt() != null && event.getNextAttemptAt().isAfter(LocalDateTime.now())) return;
        provider.processVerifiedBody(event.getRawPayload());
        boolean waiting = "charge.succeeded".equals(event.getEventType())
            && deposits.findByReferenceIgnoreCase(event.getExternalReference())
                .map(d -> d.getStatus() == com.mamadou.sutura.deposit.entity.Deposit.DepositStatus.PENDING).orElse(false);
        if (waiting) postpone(event);
        else { event.setStatus("PROCESSED"); event.setProcessedAt(LocalDateTime.now()); event.setFailureReason(null); }
        events.save(event);
    }

    @Transactional
    public void failed(Long id, boolean retryable) {
        var event = events.findForUpdate(id).orElseThrow();
        if ("PROCESSED".equals(event.getStatus())) return;
        if (retryable) postpone(event);
        else { event.setStatus("FAILED"); event.setFailureReason("Payment evidence requires reconciliation"); }
        events.save(event);
    }

    private void postpone(WebhookEvent event) {
        event.setAttempts(event.getAttempts() + 1);
        event.setStatus("RETRY"); event.setFailureReason("Waiting for Sentinel; processing will continue automatically");
        event.setNextAttemptAt(LocalDateTime.now().plusSeconds(Math.min(120, 5L << Math.min(5, event.getAttempts() - 1))));
    }
}
