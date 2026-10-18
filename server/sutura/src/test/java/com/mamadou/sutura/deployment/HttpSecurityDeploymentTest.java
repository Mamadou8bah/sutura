package com.mamadou.sutura.deployment;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest(
    properties = {
      "management.endpoint.health.probes.enabled=true",
      "management.endpoint.health.group.readiness.include=readinessState,db,redis",
      "sutura.cors.allowed-origins=https://app.example.com",
      "sutura.payments.approved-payout-recovery-enabled=false"
    })
@ActiveProfiles("test")
class HttpSecurityDeploymentTest {
  @org.springframework.test.context.bean.override.mockito.MockitoBean
  org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory unavailableRedis;

  @Autowired WebApplicationContext context;
  MockMvc mvc;

  @BeforeEach
  void setup() {
    mvc = webAppContextSetup(context).apply(springSecurity()).build();
  }

  @Test
  void unauthenticatedApiReturnsJson401() throws Exception {
    mvc.perform(get("/api/v1/admin/operations/customers"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith("application/json"));
  }

  @Test
  void configuredBrowserCanPreflightAuthentication() throws Exception {
    mvc.perform(
            options("/api/auth/login")
                .header("Origin", "https://app.example.com")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type,authorization"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "https://app.example.com"))
        .andExpect(header().doesNotExist("Access-Control-Allow-Credentials"));
  }

  @Test
  void unconfiguredOriginsCannotReadApi() throws Exception {
    mvc.perform(
            options("/api/auth/login")
                .header("Origin", "https://attacker.example.com")
                .header("Access-Control-Request-Method", "POST"))
        .andExpect(status().isForbidden())
        .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
  }

  @Test
  void unavailableRedisRemovesReadinessButNotLiveness() throws Exception {
    mvc.perform(get("/actuator/health/readiness")).andExpect(status().isServiceUnavailable());
    mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
  }

  @Test
  void operationalEndpointsRejectAllNonAdminRoles() throws Exception {
    for (String role : java.util.List.of("USER", "MERCHANT", "AGENT", "DEVELOPER")) {
      var identity =
          org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
              .user("staff")
              .roles(role);
      mvc.perform(
              post("/api/v1/webhooks/replay")
                  .with(identity)
                  .contentType("application/json")
                  .content("{\"webhookEventId\":1,\"reason\":\"Operator replay\"}"))
          .andExpect(status().isForbidden());
      mvc.perform(get("/api/v1/reconciliation/wallets/WALLET_LEDGER/latest-report").with(identity))
          .andExpect(status().isForbidden());
      mvc.perform(get("/api/v1/admin/alerts").with(identity)).andExpect(status().isForbidden());
      mvc.perform(
              post("/api/v1/admin/transactions/reverse")
                  .with(identity)
                  .contentType("application/json")
                  .content(
                      "{\"transactionId\":1,\"reason\":\"Role boundary"
                          + " check\",\"refundToWallet\":true}"))
          .andExpect(status().isForbidden());
    }
  }

  @Test
  void malformedJsonReturnsBadRequestWithoutInternalDetails() throws Exception {
    mvc.perform(
            post("/api/v1/transactions/search")
                .with(
                    org.springframework.security.test.web.servlet.request
                        .SecurityMockMvcRequestPostProcessors.user("customer")
                        .roles("USER"))
                .contentType("application/json")
                .content("{"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Invalid JSON request"));
  }

  @Test
  void actuatorDataRemainsProtected() throws Exception {
    mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
  }
}
