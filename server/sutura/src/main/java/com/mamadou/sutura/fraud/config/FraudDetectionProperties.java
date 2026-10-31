package com.mamadou.sutura.fraud.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "sutura.fraud-detection")
public class FraudDetectionProperties {

    private boolean enabled = true;
    /** Whether the separately deployed Sentinel service is configured and ready. */
    private boolean connected = true;
    private String baseUrl = "http://localhost:8080";
    private int timeoutMs = 2000;
    private String defaultCountry = "GM";
    private String defaultChannel = "api";
    /** Sentinel tenant credential sent as X-Api-Key. */
    private String apiKey = "";
}
