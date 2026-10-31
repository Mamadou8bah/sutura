package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import com.mamadou.sutura.common.config.ProductionStartupValidator;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class ProductionStartupValidatorTest {
  MockEnvironment valid() {
    var env = new MockEnvironment().withProperty("sutura.auth.require-second-factor", "true");
    for (String key :
        new String[] {
          "sutura.notifications.alert-email",
          "spring.datasource.password",
          "spring.data.redis.password",
          "spring.mail.host",
          "spring.mail.username",
          "spring.mail.password",
          "sutura.notifications.email.from",
          "sutura.webhooks.modempay.api-key",
          "sutura.sentinel-webhook.tenant-code",
          "sutura.fraud-detection.api-key"
        }) env.withProperty(key, "configured-test-value");
    env.withProperty("spring.jpa.hibernate.ddl-auto", "validate")
        .withProperty("spring.flyway.enabled", "true")
        .withProperty("spring.flyway.baseline-on-migrate", "false")
        .withProperty("sutura.notifications.sms.provider", "jokoor")
        .withProperty("sutura.notifications.sms.jokoor.api-key", "sk_live_validation_only")
        .withProperty("sutura.notifications.email.provider", "smtp")
        .withProperty(
            "sutura.webhooks.modempay.signing-secret", "provider-signing-test-secret-long-enough")
        .withProperty(
            "sutura.sentinel-webhook.signing-secret", "sentinel-signing-test-secret-long-enough")
        .withProperty(
            "jwt.secret",
            java.util.Base64.getEncoder()
                .encodeToString(
                    "deployment-test-signing-key-at-least-32-bytes"
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8)))
        .withProperty("sutura.cors.allowed-origins", "https://app.example.com")
        .withProperty("sutura.webhooks.modempay.api-url", "https://api.modempay.com")
        .withProperty("sutura.fraud-detection.base-url", "http://sentinel:8080")
        .withProperty("sutura.fraud-detection.enabled", "true")
        .withProperty("sutura.ratelimit.fail-open", "false")
        .withProperty("spring.mail.properties.mail.smtp.starttls.required", "true");
    return env;
  }

  @Test
  void acceptsCompleteConfiguration() {
    assertDoesNotThrow(() -> new ProductionStartupValidator(valid()).afterPropertiesSet());
  }

  @Test
  void backendCanStartBeforeSentinelAndFrontendWithoutDisablingFraudProtection() {
    var env = valid().withProperty("sutura.fraud-detection.connected", "false")
        .withProperty("sutura.fraud-detection.base-url", "")
        .withProperty("sutura.cors.allowed-origins", "");
    assertDoesNotThrow(() -> new ProductionStartupValidator(env).afterPropertiesSet());
    env.withProperty("sutura.fraud-detection.connected", "true");
    assertThrows(IllegalStateException.class,
        () -> new ProductionStartupValidator(env).afterPropertiesSet());
    env.withProperty("sutura.fraud-detection.connected", "false")
        .withProperty("sutura.fraud-detection.enabled", "false");
    assertThrows(IllegalStateException.class,
        () -> new ProductionStartupValidator(env).afterPropertiesSet());
  }

  @Test
  void acceptsOnlyAuthenticatedOrRenderPrivateRedisUrls() {
    assertDoesNotThrow(
        () ->
            new ProductionStartupValidator(
                    valid()
                        .withProperty(
                            "spring.data.redis.url",
                            "rediss://default:private-password@cache.example.com:6379"))
                .afterPropertiesSet());
    assertDoesNotThrow(
        () ->
            new ProductionStartupValidator(
                    valid()
                        .withProperty("spring.data.redis.url", "redis://red-internal:6379")
                        .withProperty("RENDER", "true"))
                .afterPropertiesSet());
    assertThrows(
        IllegalStateException.class,
        () ->
            new ProductionStartupValidator(
                    valid().withProperty("spring.data.redis.url", "redis://cache.example.com:6379"))
                .afterPropertiesSet());
  }

  @Test
  void rejectsUnsafeDatabaseAndDisabledDelivery() {
    for (String[] pair :
        new String[][] {
          {"spring.jpa.hibernate.ddl-auto", "update"},
          {"spring.flyway.enabled", "false"},
          {"spring.flyway.baseline-on-migrate", "true"},
          {"sutura.notifications.sms.provider", "noop"},
          {"sutura.notifications.email.provider", "noop"},
          {"sutura.ratelimit.fail-open", "true"}
        })
      assertThrows(
          IllegalStateException.class,
          () ->
              new ProductionStartupValidator(valid().withProperty(pair[0], pair[1]))
                  .afterPropertiesSet());
  }

  @Test
  void rejectsInvalidOriginsAndSecretsWithoutLeakingValues() {
    for (String[] pair :
        new String[][] {
          {"sutura.cors.allowed-origins", "*"},
          {"sutura.cors.allowed-origins", "http://app.example.com"},
          {"sutura.cors.allowed-origins", "https://app.example.com/path"},
          {"jwt.secret", "private-invalid-secret"},
          {"sutura.sentinel-webhook.signing-secret", "private-short-secret"},
          {"spring.mail.password", ""}
        }) {
      var error =
          assertThrows(
              IllegalStateException.class,
              () ->
                  new ProductionStartupValidator(valid().withProperty(pair[0], pair[1]))
                      .afterPropertiesSet());
      assertFalse(error.getMessage().contains("private-"));
    }
  }

  @Test
  void httpsEmailDoesNotRequireSmtpCredentials() {
    var env =
        valid()
            .withProperty("sutura.notifications.email.provider", "resend")
            .withProperty("sutura.notifications.email.api-key", "test-api-key")
            .withProperty("spring.mail.host", "")
            .withProperty("spring.mail.username", "")
            .withProperty("spring.mail.password", "");
    assertDoesNotThrow(() -> new ProductionStartupValidator(env).afterPropertiesSet());
    env.withProperty("sutura.notifications.email.api-key", "");
    assertThrows(
        IllegalStateException.class,
        () -> new ProductionStartupValidator(env).afterPropertiesSet());
  }

  @Test
  void rejectsMissingAndTestSmsKeysWithoutLeakingThem() {
    for (String key : new String[] {"", "sk_test_private_value", "sk_live_"}) {
      var failure =
          assertThrows(
              IllegalStateException.class,
              () ->
                  new ProductionStartupValidator(
                          valid().withProperty("sutura.notifications.sms.jokoor.api-key", key))
                      .afterPropertiesSet());
      assertFalse(failure.getMessage().contains("private_value"));
    }
  }

  @Test
  void deferredPaymentsDoNotRequireCredentialsButEnablingThemDoes() {
    var env = valid()
        .withProperty("sutura.webhooks.modempay.enabled", "false")
        .withProperty("sutura.webhooks.modempay.api-key", "")
        .withProperty("sutura.webhooks.modempay.signing-secret", "");
    assertDoesNotThrow(() -> new ProductionStartupValidator(env).afterPropertiesSet());
    env.withProperty("sutura.webhooks.modempay.enabled", "true");
    assertThrows(IllegalStateException.class,
        () -> new ProductionStartupValidator(env).afterPropertiesSet());
  }
}
