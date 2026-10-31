package com.mamadou.sutura.fraud;

import com.mamadou.sutura.fraud.client.FraudDetectionClient;
import com.mamadou.sutura.fraud.config.FraudDetectionProperties;
import com.mamadou.sutura.fraud.dto.TransactionEventRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class FraudDetectionClientTest {
    private final FraudDetectionProperties properties = new FraudDetectionProperties();
    private final RestTemplate restTemplate = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
    private final FraudDetectionClient client = new FraudDetectionClient(properties, restTemplate);
    private final TransactionEventRequest event = new TransactionEventRequest(
            "transfer-42", "7", new BigDecimal("123456789.12"), "GMD", "sutura", "4829",
            "127.0.0.1", "web-7", "000000", "GM", Instant.parse("2026-10-04T10:00:00Z"),
            "api", Map.of("counterparty", "customer-8", "operation_type", "transfer", "available_balance", new BigDecimal("400.00")));

    @BeforeEach
    void configure() {
        properties.setBaseUrl("http://sentinel:8080/");
        properties.setApiKey("test-tenant-key");
    }

    @Test
    void disconnectedSentinelNeverMakesARequest() {
        properties.setConnected(false);
        assertThatThrownBy(() -> client.score(event)).isInstanceOf(RestClientException.class)
                .hasMessageContaining("not connected");
        server.verify();
    }

    @Test
    void sendsTenantContractAndPreservesReviewCaseAndExplanation() {
        server.expect(requestTo("http://sentinel:8080/api/integration/transactions/score"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Api-Key", "test-tenant-key"))
                .andExpect(content().string(containsString("\"externalCustomerId\":\"7\"")))
                .andExpect(content().string(containsString("\"externalTransactionId\":\"transfer-42\"")))
                .andExpect(content().string(containsString("\"amount\":123456789.12")))
                .andExpect(content().string(containsString("\"counterparty\":\"customer-8\"")))
                .andExpect(content().string(containsString("\"transactionType\":\"TRANSFER\"")))
                .andExpect(content().string(containsString("\"availableBalance\":400.00")))
                .andRespond(withSuccess(response("REVIEW"), MediaType.APPLICATION_JSON));
        var decision = client.score(event);
        assertThat(decision.decision()).isEqualTo("review");
        assertThat(decision.score()).isEqualTo(0.7);
        assertThat(decision.reasons()).contains("High velocity", "VELOCITY");
        assertThat(decision.features()).containsEntry("sentinelCaseId", "case-9");
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "null", "UNKNOWN", "WRONG_TRANSACTION", "WRONG_CUSTOMER", "INVALID_SCORE", "MISSING_EXPLANATION"})
    void rejectsIncompleteOrMismatchedResponses(String variant) {
        String body = switch (variant) {
            case "{}", "null" -> variant;
            case "WRONG_TRANSACTION" -> response("ALLOW").replace("transfer-42", "another-transfer");
            case "WRONG_CUSTOMER" -> response("ALLOW").replace("\"externalCustomerId\":\"7\"", "\"externalCustomerId\":\"8\"");
            case "INVALID_SCORE" -> response("ALLOW").replace("0.7", "1.7");
            case "MISSING_EXPLANATION" -> response("ALLOW").replace("High velocity", "");
            default -> response(variant);
        };
        server.expect(requestTo("http://sentinel:8080/api/integration/transactions/score"))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.score(event)).isInstanceOf(RestClientException.class);
        server.verify();
    }

    @Test
    void requiresTenantKeyBeforeSendingRequest() {
        properties.setApiKey("");
        assertThatThrownBy(() -> client.score(event)).isInstanceOf(RestClientException.class);
        server.verify();
    }

    @Test
    void checksSentinelActuatorHealth() {
        server.expect(requestTo("http://sentinel:8080/actuator/health"))
                .andRespond(withSuccess("{\"status\":\"UP\"}", MediaType.APPLICATION_JSON));
        assertThat(client.isHealthy()).isTrue();
        server.verify();
    }

    private String response(String recommendation) {
        return """
                {"externalTransactionId":"transfer-42","externalCustomerId":"7",
                 "transactionId":"sentinel-42","anomalyScore":0.7,"recommendation":"%s",
                 "explanation":"High velocity","ruleFlags":["VELOCITY"],"caseId":"case-9"}
                """.formatted(recommendation);
    }
}
