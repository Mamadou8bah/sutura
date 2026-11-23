package com.mamadou.sutura.webhook.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Modem Pay webhook payload structure
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ModemPayWebhookPayload {

    @JsonProperty("event")
    private String event;

    @JsonProperty("timestamp")
    private Long timestamp;

    @JsonProperty("payload")
    @JsonAlias("data")
    private ModemPayChargeData data;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ModemPayChargeData {

        @JsonProperty("id")
        private String chargeId;

        @JsonProperty("public_key")
        private String publicKey;

        @JsonProperty("amount")
        private BigDecimal amount;

        @JsonProperty("currency")
        private String currency;

        @JsonProperty("status")
        private String status;  // succeeded, pending, cancelled, failed

        @JsonProperty("test_mode")
        private Boolean testMode;

        @JsonProperty("customer_name")
        private String customerName;

        @JsonProperty("customer_email")
        private String customerEmail;

        @JsonProperty("customer_phone")
        private String customerPhone;

        @JsonProperty("reference")
        private String reference;  // Your internal reference

        @JsonProperty("payment_method")
        private String paymentMethod;

        @JsonProperty("metadata")
        private java.util.Map<String, Object> metadata;

        @JsonProperty("created_at")
        private String createdAt;

        @JsonProperty("updated_at")
        private String updatedAt;

        @JsonProperty("description")
        private String description;

        @JsonProperty("receipt_url")
        private String receiptUrl;

        @JsonProperty("failure_reason")
        private String failureReason;
    }
}
