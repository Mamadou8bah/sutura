package com.mamadou.sutura.webhook;

import com.mamadou.sutura.webhook.client.*;
import com.mamadou.sutura.webhook.config.ModemPayConfig;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class ModemPayClientTest {
    private ModemPayClient client;
    private MockRestServiceServer server;
    @BeforeEach void setup() {
        var config = new ModemPayConfig();
        config.setApiUrl("https://provider.example"); config.setApiKey("test-only-key");
        client = new ModemPayClient(config);
        server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(client, "restTemplate")).build();
    }
    @Test void createsHostedIntentWithoutConfusingIntentAndChargeIds() {
        server.expect(requestTo("https://provider.example/v1/payments"))
                .andExpect(method(HttpMethod.POST)).andExpect(header("Idempotency-Key", "stable-key"))
                .andExpect(jsonPath("$.data.metadata.sutura_reference").value("deposit-ref"))
                .andExpect(jsonPath("$.data.amount").value(30))
                .andRespond(withSuccess("{\"data\":{\"id\":\"intent-1\",\"payment_link\":\"https://test.checkout.modempay.com/intent-1\"}}", MediaType.APPLICATION_JSON));
        var request = new CreateChargeRequest(); request.setAmount(new BigDecimal("30")); request.setCurrency("GMD");
        request.setReference("deposit-ref"); request.setIdempotencyKey("stable-key");
        var result = client.createCharge(request);
        assertThat(result.getId()).isNull();
        assertThat(result.getPaymentUrl()).contains("intent-1");
        server.verify();
    }
    @Test void disabledProviderCannotInitiateChargesPayoutsOrAcceptCallbacks() {
        var config = new ModemPayConfig();
        config.setEnabled(false);
        var disabled = new ModemPayClient(config);
        for (Runnable call : java.util.List.<Runnable>of(
                () -> disabled.createCharge(null), () -> disabled.createPayout(null))) {
            assertThatThrownBy(call::run)
                    .isInstanceOfSatisfying(org.springframework.web.server.ResponseStatusException.class,
                            error -> assertThat(error.getStatusCode().value()).isEqualTo(503));
        }
        var validator = new com.mamadou.sutura.webhook.validator.WebhookSignatureValidator("private-fixture-secret");
        ReflectionTestUtils.setField(validator, "enabled", false);
        assertThat(validator.isValid("payload", "signature")).isFalse();
        server.verify();
    }

    @Test void sendsDocumentedTransferFieldsAndStableKey() {
        server.expect(requestTo("https://provider.example/v1/transfers"))
                .andExpect(header("Idempotency-Key", "payout-key"))
                .andExpect(jsonPath("$.network").value("wave"))
                .andExpect(jsonPath("$.account_number").value("7000001"))
                .andExpect(jsonPath("$.beneficiary_name").value("Test User"))
                .andExpect(jsonPath("$.metadata.sutura_reference").value("withdrawal-ref"))
                .andRespond(withSuccess("{\"id\":\"transfer-1\",\"status\":\"pending\"}", MediaType.APPLICATION_JSON));
        var request = new CreatePayoutRequest(); request.setAmount(BigDecimal.TEN); request.setCurrency("GMD");
        request.setWithdrawalMethod("wave"); request.setPhoneNumber("7000001"); request.setBeneficiaryName("Test User");
        request.setReference("withdrawal-ref"); request.setIdempotencyKey("payout-key");
        assertThat(client.createPayout(request).getId()).isEqualTo("transfer-1"); server.verify();
    }
}
