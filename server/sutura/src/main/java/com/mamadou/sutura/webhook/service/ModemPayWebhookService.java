package com.mamadou.sutura.webhook.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mamadou.sutura.deposit.entity.Deposit.DepositStatus;
import com.mamadou.sutura.withdrawal.service.WithdrawalReservationService;
import com.mamadou.sutura.webhook.dto.ModemPayWebhookPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ModemPayWebhookService {
    private final WebhookSignatureService signatureService;
    private final ObjectMapper objectMapper;
    private final ProviderDepositSettlementService deposits;
    private final WithdrawalReservationService payouts;
    private final com.mamadou.sutura.webhook.config.ModemPayConfig config;

    @Transactional
    public void processWebhook(String rawPayload, String signature) {
        verifyAndRead(rawPayload, signature);
        processVerifiedBody(rawPayload);
    }

    public ModemPayWebhookPayload verifyAndRead(String rawPayload, String signature) {
        if (!signatureService.verifySignature(rawPayload, signature))
            throw new SecurityException("Invalid webhook signature");
        return readPayload(rawPayload);
    }

    private ModemPayWebhookPayload readPayload(String rawPayload) {
        ModemPayWebhookPayload payload;
        try { payload = objectMapper.readValue(rawPayload, ModemPayWebhookPayload.class); }
        catch (Exception ex) { throw new IllegalArgumentException("Invalid webhook JSON", ex); }
        if (payload.getEvent() == null || payload.getData() == null)
            throw new IllegalArgumentException("Webhook event and data are required");
        var d = payload.getData();
        if (java.util.Set.of("charge.succeeded", "charge.failed", "charge.cancelled", "charge.pending",
                "payout.succeeded", "payout.failed", "transfer.succeeded", "transfer.failed", "transfer.cancelled").contains(payload.getEvent())) {
            String key = config.getApiKey();
            boolean live = key != null && key.startsWith("sk_live_");
            boolean test = key != null && key.startsWith("sk_test_");
            if ((!live && !test) || d.getTestMode() == null || d.getTestMode() != test)
                throw new SecurityException("Webhook mode does not match the configured payment account");
        }
        if ((d.getReference() == null || d.getReference().isBlank()) && d.getMetadata() != null) {
            Object reference = d.getMetadata().get("sutura_reference");
            if (reference instanceof String value) d.setReference(value);
        }
        return payload;
    }

    /** Only a previously authenticated, durable inbox receipt may call this path. */
    @Transactional
    public void processVerifiedBody(String rawPayload) {
        var payload = readPayload(rawPayload);
        var d = payload.getData();
        switch (payload.getEvent()) {
            case "charge.succeeded" -> deposits.complete(d.getReference(), null, d.getAmount(), d.getCurrency(), d.getChargeId());
            case "charge.failed" -> deposits.updateStatus(d.getReference(), d.getAmount(), d.getCurrency(), d.getChargeId(), DepositStatus.FAILED, d.getFailureReason());
            case "charge.cancelled" -> deposits.updateStatus(d.getReference(), d.getAmount(), d.getCurrency(), d.getChargeId(), DepositStatus.CANCELLED, d.getFailureReason());
            case "charge.pending" -> deposits.updateStatus(d.getReference(), d.getAmount(), d.getCurrency(), d.getChargeId(), DepositStatus.PENDING, null);
            case "payout.succeeded", "transfer.succeeded" -> payouts.confirm(d.getReference(), d.getAmount(), d.getCurrency(), d.getChargeId());
            case "payout.failed", "transfer.failed", "transfer.cancelled" -> payouts.release(d.getReference(), d.getAmount(), d.getCurrency(), d.getChargeId(), d.getFailureReason());
            default -> { /* Unsupported events move no funds. */ }
        }
    }
}
