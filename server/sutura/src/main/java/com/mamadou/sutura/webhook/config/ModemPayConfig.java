package com.mamadou.sutura.webhook.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for Modem Pay integration
 *
 * Properties prefix: sutura.webhooks.modempay
 *
 * Example:
 * sutura:
 *   webhooks:
 *     modempay:
 *       signing-secret: your_secret
 *       api-key: your_api_key
 */
@Configuration
@ConfigurationProperties(prefix = "sutura.webhooks.modempay")
@Data
public class ModemPayConfig {
    /** Disable external payment operations while the provider is not configured. */
    private boolean enabled = true;

    /**
     * Webhook signing secret for signature verification
     * Used to verify that webhooks are from Modem Pay
     */
    private String signingSecret;

    /**
     * HTTP header name for webhook signature
     * Default: x-modem-signature
     */
    private String signatureHeader = "x-modem-signature";

    /**
     * Modem Pay API key for making API calls
     * Used if you need to query Modem Pay API directly
     */
    private String apiKey;

    /**
     * Modem Pay public key
     * Used for client-side payment integration
     */
    private String publicKey;

    /**
     * Modem Pay API base URL
     * Default: https://api.modempay.com
     */
    private String apiUrl = "https://api.modempay.com";

    /**
     * Enable webhook signature verification
     * Default: true
     */
    private boolean verifySignature = true;

    /**
     * Webhook retry attempts on failure
     * Default: 3
     */
    private int maxRetries = 3;

    /**
     * Webhook retry interval in seconds
     * Default: 60
     */
    private int retryInterval = 60;
}
