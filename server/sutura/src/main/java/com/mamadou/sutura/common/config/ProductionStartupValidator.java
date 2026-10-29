package com.mamadou.sutura.common.config;

import java.net.URI;
import java.util.Base64;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Refuse a production configuration that cannot safely serve live accounts. Never log values. */
@Component
@Profile("prod")
public class ProductionStartupValidator implements InitializingBean {
  private final Environment env;

  public ProductionStartupValidator(Environment env) {
    this.env = env;
  }

  @Override
  public void afterPropertiesSet() {
    require("sutura.auth.require-second-factor", "true");
    require("spring.jpa.hibernate.ddl-auto", "validate");
    require("spring.flyway.enabled", "true");
    require("spring.flyway.baseline-on-migrate", "false");
    require("sutura.notifications.sms.provider", "jokoor");
    String smsKey = required("sutura.notifications.sms.jokoor.api-key");
    if (!smsKey.startsWith("sk_live_") || smsKey.length() <= 8)
      fail("sutura.notifications.sms.jokoor.api-key", "must be a live Jokoor API key");
    String emailProvider = required("sutura.notifications.email.provider");
    if (!java.util.Set.of("smtp", "resend").contains(emailProvider))
      fail("sutura.notifications.email.provider", "must be smtp or resend");
    if ("resend".equals(emailProvider)) required("sutura.notifications.email.api-key");
    else
      for (String key :
          new String[] {"spring.mail.host", "spring.mail.username", "spring.mail.password"})
        required(key);
    for (String key :
        new String[] {
          "sutura.notifications.alert-email",
          "spring.datasource.password",
          "sutura.notifications.email.from",
          "sutura.webhooks.modempay.api-key",
          "sutura.sentinel-webhook.tenant-code",
          "sutura.fraud-detection.api-key"
        }) required(key);
    String redisUrl = env.getProperty("spring.data.redis.url", "");
    if (redisUrl.isBlank()) required("spring.data.redis.password");
    else {
      URI redis;
      try {
        redis = URI.create(redisUrl);
      } catch (IllegalArgumentException e) {
        throw new IllegalStateException("spring.data.redis.url must be a Redis URL");
      }
      if (!java.util.Set.of("redis", "rediss").contains(String.valueOf(redis.getScheme()))
          || redis.getHost() == null) fail("spring.data.redis.url", "must be a Redis URL");
      boolean authenticated =
          redis.getUserInfo() != null
              && redis.getUserInfo().contains(":")
              && !redis.getUserInfo().endsWith(":");
      boolean renderPrivate =
          env.getProperty("RENDER", Boolean.class, false)
              && redis.getHost().matches("red-[a-z0-9-]+")
              && "redis".equals(redis.getScheme());
      if (!authenticated && !renderPrivate)
        fail(
            "spring.data.redis.url",
            "requires authentication outside Render's private Key Value network");
    }
    for (String key :
        new String[] {
          "sutura.webhooks.modempay.signing-secret", "sutura.sentinel-webhook.signing-secret"
        }) {
      if (required(key).length() < 32) fail(key, "must contain at least 32 characters");
    }
    String jwt = required("jwt.secret");
    try {
      if (Base64.getDecoder().decode(jwt).length < 32)
        fail("jwt.secret", "must encode at least 32 bytes");
    } catch (IllegalArgumentException e) {
      fail("jwt.secret", "must be Base64");
    }
    if (jwt.equals("ZGV2ZWxvcG1lbnQtc2VjcmV0LWtleS1mb3ItcGF5Zmxvdy1hcHAtMzItYnl0ZXM="))
      fail("jwt.secret", "must not use the development key");
    for (String origin : required("sutura.cors.allowed-origins").split(",")) {
      URI uri = url("sutura.cors.allowed-origins", origin.trim(), true);
      if (uri.getRawPath() != null && !uri.getRawPath().isEmpty())
        fail("sutura.cors.allowed-origins", "must contain exact origins without paths");
    }
    url("sutura.webhooks.modempay.api-url", required("sutura.webhooks.modempay.api-url"), true);
    url("sutura.fraud-detection.base-url", required("sutura.fraud-detection.base-url"), false);
    require("sutura.fraud-detection.enabled", "true");
    require("sutura.ratelimit.fail-open", "false");
    boolean tls =
        env.getProperty("spring.mail.properties.mail.smtp.starttls.required", Boolean.class, false);
    boolean ssl =
        env.getProperty("spring.mail.properties.mail.smtp.ssl.enable", Boolean.class, false);
    if ("smtp".equals(emailProvider) && !tls && !ssl)
      fail("spring.mail", "requires STARTTLS or TLS");
  }

  private String required(String key) {
    String value = env.getProperty(key);
    if (value == null
        || value.isBlank()
        || value.contains("${")
        || value.toLowerCase(java.util.Locale.ROOT).startsWith("change-me"))
      fail(key, "must be configured");
    return value;
  }

  private void require(String key, String expected) {
    if (!expected.equalsIgnoreCase(required(key))) fail(key, "must be " + expected);
  }

  private URI url(String key, String value, boolean https) {
    try {
      URI uri = URI.create(value);
      if (uri.getHost() == null
          || uri.getUserInfo() != null
          || uri.getQuery() != null
          || uri.getFragment() != null
          || !("https".equals(uri.getScheme()) || (!https && "http".equals(uri.getScheme()))))
        fail(key, "must be a valid " + (https ? "HTTPS" : "HTTP(S)") + " URL");
      return uri;
    } catch (IllegalArgumentException e) {
      throw new IllegalStateException(key + " must be a valid URL");
    }
  }

  private void fail(String key, String message) {
    throw new IllegalStateException(key + " " + message);
  }
}
