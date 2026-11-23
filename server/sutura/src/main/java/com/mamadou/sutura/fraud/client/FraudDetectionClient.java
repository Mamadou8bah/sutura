package com.mamadou.sutura.fraud.client;

import com.mamadou.sutura.fraud.config.FraudDetectionProperties;
import com.mamadou.sutura.fraud.dto.FraudDecisionResponse;
import com.mamadou.sutura.fraud.dto.TransactionEventRequest;
import com.mamadou.sutura.fraud.dto.SentinelScoreRequest;
import com.mamadou.sutura.fraud.dto.SentinelScoreResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class FraudDetectionClient {

    private final FraudDetectionProperties properties;
    private final RestTemplate fraudDetectionRestTemplate;

    public FraudDecisionResponse score(TransactionEventRequest event) {
        if (!properties.isConnected())
            throw new RestClientException("Sentinel is not connected yet");
        if (properties.getApiKey() == null || properties.getApiKey().isBlank()) {
            throw new RestClientException("Sentinel tenant API key is required");
        }
        String url = properties.getBaseUrl().replaceAll("/+$", "") + "/api/integration/transactions/score";
        // The old merchant_id field is not a transfer counterparty. Do not invent context.
        Object counterparty = event.metadata() == null ? null : event.metadata().get("counterparty");
        SentinelScoreRequest request = new SentinelScoreRequest(
                event.user_id(), event.transaction_id(), event.amount(), event.currency(),
                event.timestamp(), event.channel(), event.country(),
                counterparty == null ? null : counterparty.toString(),
                event.metadata() == null || event.metadata().get("operation_type") == null ? null
                        : event.metadata().get("operation_type").toString().toUpperCase(Locale.ROOT),
                event.metadata() != null && event.metadata().get("available_balance") instanceof Number balance
                    ? new java.math.BigDecimal(balance.toString()) : null);
        long start = System.nanoTime();
        SentinelScoreResponse response = requestScore(url, request);
        validateResponse(event, response);
        List<String> reasons = new ArrayList<>();
        if (response.explanation() != null && !response.explanation().isBlank()) {
            reasons.add(response.explanation());
        }
        if (response.ruleFlags() != null) reasons.addAll(response.ruleFlags());
        Map<String, Object> features = new LinkedHashMap<>();
        features.put("provider", "sentinel");
        features.put("sentinelTransactionId", response.transactionId());
        if (response.caseId() != null) features.put("sentinelCaseId", response.caseId());
        features.put("shapTopFeatures", response.shapTopFeatures() == null ? List.of() : response.shapTopFeatures());
        return new FraudDecisionResponse(
                response.externalTransactionId(), response.recommendation().toLowerCase(Locale.ROOT),
                response.anomalyScore(), reasons, (System.nanoTime() - start) / 1_000_000.0,
                response.ruleFlags() == null || response.ruleFlags().isEmpty() ? null : response.ruleFlags().get(0),
                features);
    }

    private SentinelScoreResponse requestScore(String url, SentinelScoreRequest request) {
        // Retry only gateway availability failures, once. Sentinel deduplicates
        // this exact externalTransactionId and validates its original payload.
        // This never retries the wallet transfer or any ledger posting.
        for (int attempt = 0; ; attempt++) {
            try {
                return fraudDetectionRestTemplate.postForObject(
                        url, new HttpEntity<>(request, authHeaders()), SentinelScoreResponse.class);
            } catch (RestClientResponseException ex) {
                int status = ex.getStatusCode().value();
                if (attempt != 0 || (status != 502 && status != 503 && status != 504)) throw ex;
                log.warn("Sentinel gateway returned HTTP {}; retrying scoring once for {}",
                        status, request.externalTransactionId());
            }
        }
    }

    private void validateResponse(TransactionEventRequest event, SentinelScoreResponse response) {
        if (response == null
                || !event.transaction_id().equals(response.externalTransactionId())
                || !event.user_id().equals(response.externalCustomerId())
                || response.transactionId() == null || response.transactionId().isBlank()
                || response.recommendation() == null
                || !Set.of("ALLOW", "REVIEW", "BLOCK").contains(response.recommendation())
                || response.anomalyScore() == null || !Double.isFinite(response.anomalyScore())
                || response.anomalyScore() < 0 || response.anomalyScore() > 1
                || response.explanation() == null || response.explanation().isBlank()) {
            throw new RestClientException("Invalid or mismatched Sentinel scoring response");
        }
    }

    public boolean isHealthy() {
        try {
            String url = properties.getBaseUrl().replaceAll("/+$", "") + "/actuator/health";
            Map<?, ?> response = fraudDetectionRestTemplate.getForObject(url, Map.class);
            return response != null && "UP".equals(response.get("status"));
        } catch (RestClientException ex) {
            log.warn("Fraud detection health check failed ({})", ex.getClass().getSimpleName());
            return false;
        }
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String apiKey = properties.getApiKey();
        if (apiKey != null && !apiKey.isBlank()) {
            headers.set("X-Api-Key", apiKey);
        }
        return headers;
    }
}
