package com.mamadou.sutura.webhook.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mamadou.sutura.webhook.dto.DepositWebhookRequest;
import com.mamadou.sutura.webhook.dto.WebhookResponse;
import com.mamadou.sutura.webhook.entity.WebhookEvent;
import com.mamadou.sutura.webhook.repository.WebhookEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
public class WebhookService {

    private static final String PROVIDER_MODEMPAY = "MODEMPAY";

    private final ObjectMapper objectMapper;
    private final WebhookEventRepository webhookEventRepository;
    private final WebhookValidationService webhookValidationService;
    private final DepositProcessingService depositProcessingService;

    @Qualifier("webhookExecutor")
    private final TaskExecutor webhookExecutor;

    @Transactional
    public WebhookResponse handleModemPayDeposit(String rawPayload, HttpHeaders headers) {
        // Authenticate before event lookup: invalid deliveries cannot poison a receipt or bypass validation on replay.
        if (!webhookValidationService.hasValidSignature(rawPayload, headers))
            return new WebhookResponse(false, null, "SIGNATURE_FAILED", "Invalid webhook signature");
        DepositWebhookRequest request = parseLenient(rawPayload);
        String externalEventId = resolveEventId(rawPayload, request);

        WebhookEvent event = webhookEventRepository.findByProviderAndExternalEventId(PROVIDER_MODEMPAY, externalEventId)
                .orElseGet(() -> webhookEventRepository.save(WebhookEvent.builder()
                        .provider(PROVIDER_MODEMPAY)
                        .externalEventId(externalEventId)
                        .eventType(request == null ? null : request.eventType())
                        .externalReference(request == null ? null : request.reference())
                        .status("RECEIVED")
                        .rawPayload(rawPayload)
                        .headers(serializeHeaders(headers))
                        .attempts(0)
                        .build()));

        if (!rawPayload.equals(event.getRawPayload()))
            return new WebhookResponse(false, event.getId(), "FAILED", "Event id reused with different payload");
        if ("PROCESSED".equals(event.getStatus()) || "IGNORED".equals(event.getStatus())) {
            return new WebhookResponse(true, event.getId(), event.getStatus(), "Webhook already handled");
        }

        return processStoredEvent(event);
    }

    @Transactional
    public CompletableFuture<WebhookResponse> handleModemPayDepositAsync(String rawPayload, HttpHeaders headers) {
        return CompletableFuture.completedFuture(handleModemPayDeposit(rawPayload, headers));
    }

    @Transactional
    public WebhookResponse processStoredEvent(WebhookEvent event) {
        event.setStatus("PROCESSING");
        event.setAttempts(event.getAttempts() + 1);
        event.setFailureReason(null);
        webhookEventRepository.save(event);

        try {
            depositProcessingService.process(event);
            if (!"IGNORED".equals(event.getStatus())) {
                event.setStatus("PROCESSED");
            }
            event.setProcessedAt(LocalDateTime.now());
            webhookEventRepository.save(event);
            return new WebhookResponse(true, event.getId(), event.getStatus(), "Webhook processed");
        } catch (RuntimeException ex) {
            event.setStatus("FAILED");
            event.setFailureReason(ex.getMessage());
            webhookEventRepository.save(event);
            return new WebhookResponse(false, event.getId(), event.getStatus(), "Webhook processing failed; operator review required");
        }
    }

    private DepositWebhookRequest parseLenient(String rawPayload) {
        try {
            return objectMapper.readValue(rawPayload, DepositWebhookRequest.class);
        } catch (Exception ex) {
            return null;
        }
    }

    private String resolveEventId(String rawPayload, DepositWebhookRequest request) {
        if (request != null && request.eventId() != null && !request.eventId().isBlank()) {
            return request.eventId().trim();
        }
        return "raw_" + sha256(rawPayload);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash webhook payload", ex);
        }
    }

    private String serializeHeaders(HttpHeaders headers) {
        try {
            return objectMapper.writeValueAsString(headers);
        } catch (Exception ex) {
            return "{}";
        }
    }
}
