package com.mamadou.sutura.kyc.client;

import com.mamadou.sutura.fraud.config.FraudDetectionProperties;
import com.mamadou.sutura.kyc.dto.SentinelKycResponse;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class SentinelKycClient {
    private final FraudDetectionProperties properties;
    private final RestTemplate fraudDetectionRestTemplate;

    public SentinelKycResponse start(String customerId) {
        requireConnected();
        var response = fraudDetectionRestTemplate.postForObject(url(""),
                new HttpEntity<>(Map.of("externalCustomerId", customerId), headers()), SentinelKycResponse.class);
        validate(response, customerId, null);
        return response;
    }

    public SentinelKycResponse get(Long sessionId, String customerId) {
        requireConnected();
        var response = fraudDetectionRestTemplate.exchange(url("/" + sessionId), HttpMethod.GET,
                new HttpEntity<>(headers()), SentinelKycResponse.class).getBody();
        validate(response, customerId, sessionId);
        return response;
    }

    private void requireConnected() {
        if (!properties.isConnected()) throw new RestClientException("Sentinel is not connected yet");
    }

    private String url(String suffix) {
        return properties.getBaseUrl().replaceAll("/+$", "") + "/api/integration/kyc/sessions" + suffix;
    }

    private HttpHeaders headers() {
        if (properties.getApiKey() == null || properties.getApiKey().isBlank()) {
            throw new RestClientException("Sentinel tenant API key is required");
        }
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Api-Key", properties.getApiKey());
        return headers;
    }

    private void validate(SentinelKycResponse r, String customerId, Long sessionId) {
        if (r == null || r.sessionId() == null || r.sessionId() <= 0
                || !customerId.equals(r.externalCustomerId())
                || (sessionId != null && !sessionId.equals(r.sessionId()))
                || !Set.of("PENDING", "COMPLETE").contains(r.status() == null ? "" : r.status())
                || r.expiresAt() == null || r.hostedUrl() == null || r.hostedUrl().length() > 2048
                || (r.explanation() != null && r.explanation().length() > 4096)) {
            throw new RestClientException("Invalid or mismatched Sentinel KYC session");
        }
        try {
            URI uri = URI.create(r.hostedUrl());
            if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
                    || uri.getHost() == null || uri.getUserInfo() != null) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException e) {
            throw new RestClientException("Invalid hosted verification URL");
        }
        if ("COMPLETE".equals(r.status()) && (r.customerId() == null
                || !Set.of("VERIFIED", "FLAGGED", "REJECTED").contains(r.kycStatus() == null ? "" : r.kycStatus())
                || !validScore(r.faceMatchScore()) || !validScore(r.livenessScore())
                || ("VERIFIED".equals(r.kycStatus()) && (r.faceMatchScore() == 0 || r.livenessScore() == 0)))) {
            throw new RestClientException("Incomplete Sentinel KYC decision");
        }
    }

    private boolean validScore(Double score) {
        return score != null && Double.isFinite(score) && score >= 0 && score <= 1;
    }
}
