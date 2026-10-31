package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import com.mamadou.sutura.common.config.CorsConfig;
import com.mamadou.sutura.webhook.sentinel.SentinelWebhookProperties;
import com.mamadou.sutura.webhook.sentinel.SentinelWebhookVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class DeferredFrontendTest {
  @Test
  void emptyFrontendOriginsDenyAllCrossOriginBrowserClients() {
    var config = new CorsConfig().corsConfigurationSource("")
        .getCorsConfiguration(new MockHttpServletRequest("OPTIONS", "/api/auth/login"));
    assertNotNull(config);
    assertNull(config.checkOrigin("https://untrusted.invalid"));
    assertTrue(config.getAllowedOrigins().isEmpty());
  }

  @Test
  void disconnectedSentinelCannotAcceptCallbacks() {
    var verifier = new SentinelWebhookVerifier(new SentinelWebhookProperties());
    ReflectionTestUtils.setField(verifier, "connected", false);
    var error = assertThrows(ResponseStatusException.class,
        () -> verifier.verify(null, null, new byte[0]));
    assertEquals(503, error.getStatusCode().value());
  }
}
