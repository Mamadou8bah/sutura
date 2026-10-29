package com.mamadou.sutura.webhook.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.mamadou.sutura.webhook.config.ModemPayConfig;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class ModemPayClient {
    private final ModemPayConfig config;
    private final RestTemplate restTemplate = httpClient();

    private static RestTemplate httpClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(10000);
        return new RestTemplate(factory);
    }

    public CreateChargeResponse createCharge(CreateChargeRequest req) {
        requireEnabled();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("amount", req.getAmount());
        data.put("currency", req.getCurrency());
        data.put("from_sdk", false);
        data.put("metadata", metadata(req.getMetadata(), req.getReference()));
        if (req.getDescription() != null) data.put("description", req.getDescription());
        if (req.getPaymentMethod() != null && !req.getPaymentMethod().equals("mobile_money"))
            data.put("payment_methods", List.of(req.getPaymentMethod()));
        JsonNode response = post("/v1/payments", Map.of("data", data), req.getIdempotencyKey());
        JsonNode intent = response.has("data") ? response.get("data") : response;
        String link = intent.path("payment_link").asText(null);
        if (link == null || link.isBlank()) throw new IllegalStateException("Provider returned no checkout URL");
        var result = new CreateChargeResponse();
        // Intent IDs are not charge IDs. The authenticated charge callback binds its ID at settlement.
        result.setPaymentUrl(link);
        result.setStatus(intent.path("status").asText(null));
        return result;
    }

    public CreatePayoutResponse createPayout(CreatePayoutRequest req) {
        requireEnabled();
        if (!Set.of("wave", "afrimoney").contains(req.getWithdrawalMethod()))
            throw new IllegalArgumentException("Unsupported payout network");
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("amount", req.getAmount());
        data.put("currency", req.getCurrency());
        data.put("network", req.getWithdrawalMethod());
        data.put("account_number", req.getPhoneNumber());
        data.put("beneficiary_name", req.getBeneficiaryName());
        data.put("metadata", metadata(req.getMetadata(), req.getReference()));
        if (req.getDescription() != null) data.put("narration", req.getDescription());
        JsonNode response = post("/v1/transfers", data, req.getIdempotencyKey());
        JsonNode payout = response.has("data") ? response.get("data") : response;
        String id = payout.path("id").asText(null);
        if (id == null || id.isBlank()) throw new IllegalStateException("Provider returned no payout ID");
        var result = new CreatePayoutResponse();
        result.setId(id);
        result.setStatus(payout.path("status").asText(null));
        return result;
    }

    public void requireEnabled() {
        if (!config.isEnabled())
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "External payments are not enabled yet");
    }

    private JsonNode post(String path, Object body, String key) {
        requireEnabled();
        if (config.getApiKey() == null || config.getApiKey().isBlank())
            throw new IllegalStateException("ModemPay API key is not configured");
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(config.getApiKey());
        if (key != null) headers.set("Idempotency-Key", key);
        String response = restTemplate.exchange(config.getApiUrl().replaceAll("/+$", "") + path,
                HttpMethod.POST, new HttpEntity<>(body, headers), String.class).getBody();
        try { return new com.fasterxml.jackson.databind.ObjectMapper().readTree(response); }
        catch (Exception ex) { throw new IllegalStateException("Invalid provider response", ex); }
    }

    private Map<String, Object> metadata(Map<String, Object> supplied, String reference) {
        var metadata = new LinkedHashMap<String, Object>();
        if (supplied != null) metadata.putAll(supplied);
        metadata.put("sutura_reference", reference);
        return metadata;
    }
}
