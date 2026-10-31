package com.mamadou.sutura.kyc;

import com.mamadou.sutura.fraud.config.FraudDetectionProperties;
import com.mamadou.sutura.kyc.client.SentinelKycClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.*;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class SentinelKycClientTest {
    private final RestTemplate rest = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(rest).build();
    private final FraudDetectionProperties properties = new FraudDetectionProperties();
    private final SentinelKycClient client = new SentinelKycClient(properties, rest);

    @BeforeEach
    void setup() {
        properties.setBaseUrl("http://sentinel:8080");
        properties.setApiKey("tenant-key");
    }

    @Test
    void disconnectedSentinelCannotStartOrCompleteIdentityVerification() {
        properties.setConnected(false);
        assertThatThrownBy(() -> client.start("7")).isInstanceOf(RestClientException.class);
        assertThatThrownBy(() -> client.get(1L, "7")).isInstanceOf(RestClientException.class);
        server.verify();
    }

    @Test
    void startsHostedSessionWithTenantKeyAndStableCustomerId() {
        server.expect(requestTo("http://sentinel:8080/api/integration/kyc/sessions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Api-Key", "tenant-key"))
                .andExpect(content().string(containsString("\"externalCustomerId\":\"7\"")))
                .andRespond(withSuccess(pending(), MediaType.APPLICATION_JSON));
        assertThat(client.start("7").sessionId()).isEqualTo(42);
        server.verify();
    }

    @Test
    void refreshAuthenticatesAndReturnsCompleteRejectedSyntheticResult() {
        server.expect(requestTo("http://sentinel:8080/api/integration/kyc/sessions/42"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-Api-Key", "tenant-key"))
                .andRespond(withSuccess(complete(), MediaType.APPLICATION_JSON));
        assertThat(client.get(42L, "7").kycStatus()).isEqualTo("REJECTED");
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"WRONG_CUSTOMER", "WRONG_SESSION", "BAD_URL", "EMPTY", "FAKE_VERIFIED"})
    void rejectsMismatchedOrUnsafeDecisions(String variant) {
        String body = switch (variant) {
            case "WRONG_CUSTOMER" -> pending().replace("\"externalCustomerId\":\"7\"", "\"externalCustomerId\":\"8\"");
            case "WRONG_SESSION" -> pending().replace("42", "43");
            case "BAD_URL" -> pending().replace("http://localhost:5173/kyc/test", "javascript:alert(1)");
            case "FAKE_VERIFIED" -> complete().replace("REJECTED", "VERIFIED");
            default -> "{}";
        };
        server.expect(requestTo("http://sentinel:8080/api/integration/kyc/sessions/42"))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.get(42L, "7")).isInstanceOf(RestClientException.class);
        server.verify();
    }

    private String pending() {
        return """
                {"sessionId":42,"status":"PENDING","externalCustomerId":"7",
                 "hostedUrl":"http://localhost:5173/kyc/test","expiresAt":"2026-10-05T10:00:00Z"}
                """;
    }

    private String complete() {
        return pending().replace("\"PENDING\"", "\"COMPLETE\"").replace("\"hostedUrl\"",
                "\"customerId\":9,\"kycStatus\":\"REJECTED\",\"faceMatchScore\":0,\"livenessScore\":0,\"hostedUrl\"");
    }
}
