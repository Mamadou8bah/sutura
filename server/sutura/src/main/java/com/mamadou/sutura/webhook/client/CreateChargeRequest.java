package com.mamadou.sutura.webhook.client;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class CreateChargeRequest {
    private BigDecimal amount;
    private String currency;
    private String phoneNumber;
    private String paymentMethod;
    private String description;
    private String reference; // our internal reference
    private String idempotencyKey;
    private String returnUrl;
    private Map<String, Object> metadata;
}
