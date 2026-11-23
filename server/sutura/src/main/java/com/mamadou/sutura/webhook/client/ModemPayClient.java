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
        validateCheckout(req.getAmount(), req.getCurrency(), req.getPaymentMethod());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("amount", req.getAmount());
        data.put("currency", req.getCurrency());
        data.put("from_sdk", false);
        data.put("metadata", metadata(req.getMetadata(), req.getReference()));
        if (req.getDescription() != null) data.put("description", req.getDescription());
        String method = req.getPaymentMethod() == null ? "checkout" : req.getPaymentMethod().trim().toLowerCase(Locale.ROOT);
        if (!method.equals("checkout")) data.put("payment_methods", List.of(method.equals("mobile_money") ? "wallet" : method));
        if (req.getPhoneNumber() != null && !req.getPhoneNumber().isBlank()) data.put("customer_phone", req.getPhoneNumber());
        String returnUrl = req.getReturnUrl() == null ? config.getWalletReturnUrl() : req.getReturnUrl();
        if (returnUrl != null && !returnUrl.isBlank()) {
            var uri = java.net.URI.create(returnUrl);
            if (!Set.of("https", "suturaapp", "suturaagent", "suturamerchant").contains(uri.getScheme())
                    || uri.getUserInfo() != null || uri.getHost() == null)
                throw new IllegalArgumentException("Invalid checkout return URL");
            data.put("return_url", returnUrl);
            data.put("cancel_url", returnUrl);
            if (!"https".equals(uri.getScheme())) data.put("skip_url_validation", true);
        }
        JsonNode response = post("/v1/payments", Map.of("data", data), req.getIdempotencyKey());
        JsonNode intent = response.has("data") ? response.get("data") : response;
        String link = intent.path("payment_link").asText(null);
        if (link == null || link.isBlank()) throw new IllegalStateException("Provider returned no checkout URL");
        var checkout = java.net.URI.create(link);
        if (!"https".equals(checkout.getScheme()) || checkout.getUserInfo() != null
                || !Set.of("checkout.modempay.com", "test.checkout.modempay.com").contains(checkout.getHost())
                || (config.getApiKey().startsWith("sk_live_") && checkout.getHost().startsWith("test.")))
            throw new IllegalStateException("Provider returned an invalid checkout URL");
        var result = new CreateChargeResponse();
        // Intent IDs are not charge IDs. The authenticated charge callback binds its ID at settlement.
        result.setPaymentUrl(link);
        result.setStatus(intent.path("status").asText(null));
        return result;
    }

    public CreatePayoutResponse createPayout(CreatePayoutRequest req) {
        requirePayoutsEnabled();
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

    public void validateCheckout(java.math.BigDecimal amount, String currency, String method) {
        requireEnabled();
        if (!"GMD".equalsIgnoreCase(currency)) throw new IllegalArgumentException("ModemPay checkout requires a GMD wallet");
        if (amount == null || amount.compareTo(java.math.BigDecimal.TEN) < 0 || amount.stripTrailingZeros().scale() > 2)
            throw new IllegalArgumentException("ModemPay checkout requires at least GMD 10 with at most two decimal places");
        if (method != null && !Set.of("checkout", "mobile_money", "wallet", "card").contains(method.trim().toLowerCase(Locale.ROOT)))
            throw new IllegalArgumentException("Unsupported checkout payment method");
    }

    public void requirePayoutsEnabled() {
        requireEnabled();
        if (!config.isPayoutsEnabled()) throw new org.springframework.web.server.ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE, "External withdrawals are not enabled yet");
    }

    public boolean checkoutEnabled() {
        return config.isEnabled() && config.getApiKey() != null && !config.getApiKey().isBlank()
                && config.getSigningSecret() != null && !config.getSigningSecret().isBlank();
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
