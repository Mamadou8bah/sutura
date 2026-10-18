package com.mamadou.sutura.webhook.controller;

import com.mamadou.sutura.webhook.dto.WebhookReplayRequest;
import com.mamadou.sutura.webhook.dto.WebhookResponse;
import com.mamadou.sutura.webhook.dto.ModemPayWebhookPayload;
import com.mamadou.sutura.webhook.service.WebhookRetryService;
import com.mamadou.sutura.webhook.service.WebhookService;
import com.mamadou.sutura.webhook.service.ModemPayWebhookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final WebhookService webhookService;
    private final WebhookRetryService webhookRetryService;
    private final ModemPayWebhookService modemPayWebhookService;

    @PostMapping("/modempay/deposits")
    public ResponseEntity<WebhookResponse> modemPayDeposit(
            @RequestBody String rawPayload,
            @RequestHeader HttpHeaders headers
    ) {
        WebhookResponse response = webhookService.handleModemPayDeposit(rawPayload, headers);
        HttpStatus status = response.accepted() ? HttpStatus.OK : HttpStatus.UNAUTHORIZED;
        if ("FAILED".equals(response.status())) {
            status = HttpStatus.UNPROCESSABLE_ENTITY;
        }
        return ResponseEntity.status(status).body(response);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/replay")
    public ResponseEntity<WebhookResponse> replay(@Valid @RequestBody WebhookReplayRequest request, @org.springframework.security.core.annotation.AuthenticationPrincipal com.mamadou.sutura.user.entity.User actor) {
        WebhookResponse response = webhookRetryService.replay(request.webhookEventId(),request.reason(),actor);
        return ResponseEntity.status(response.accepted() ? HttpStatus.OK : HttpStatus.UNPROCESSABLE_ENTITY).body(response);
    }

    /**
     * Receive and process Modem Pay webhook events (charge.succeeded, charge.failed, etc.)
     *
     * Endpoint: POST /api/v1/webhooks/modem-pay/charges
     *
     * Configure this URL in Modem Pay dashboard webhooks settings:
     * https://yourdomain.com/api/v1/webhooks/modem-pay/charges
     *
     * Events: charge.succeeded, charge.failed, charge.cancelled, charge.pending
     */
    @PostMapping("/modem-pay/charges")
    public ResponseEntity<ModemPayWebhookResponse> handleModemPayChargeWebhook(
            @RequestBody String rawPayload,
            @RequestHeader(value = "${sutura.webhooks.modempay.signature-header:x-modem-signature}", required = false) String signature) {

        try {


            // Validate signature
            if (signature == null || signature.isEmpty()) {
                log.warn("Missing webhook signature header for Modem Pay webhook");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ModemPayWebhookResponse("INVALID_SIGNATURE", "Missing signature"));
            }

            // Process webhook
            modemPayWebhookService.processWebhook(rawPayload, signature);


            return ResponseEntity.ok(
                    new ModemPayWebhookResponse("SUCCESS", "Webhook processed successfully")
            );

        } catch (SecurityException e) {
            log.warn("Invalid Modem Pay webhook: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ModemPayWebhookResponse("INVALID_SIGNATURE", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ModemPayWebhookResponse("INVALID_PAYLOAD", e.getMessage()));
        } catch (Exception e) {
            log.error("Error processing Modem Pay webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ModemPayWebhookResponse("ERROR", "Failed to process webhook"));
        }
    }

    /**
     * Health check endpoint for Modem Pay to verify webhook URL is accessible
     */
    @GetMapping("/modem-pay/health")
    public ResponseEntity<ModemPayWebhookResponse> webhookHealth() {
        return ResponseEntity.ok(
                new ModemPayWebhookResponse("OK", "Webhook service is healthy and ready")
        );
    }

    /**
     * Modem Pay webhook response DTO
     */
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ModemPayWebhookResponse {
        private String status;
        private String message;
    }
}
