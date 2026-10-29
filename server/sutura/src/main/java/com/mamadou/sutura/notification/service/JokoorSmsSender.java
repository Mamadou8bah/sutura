package com.mamadou.sutura.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/** Jokoor HTTPS SMS transport. Never log message bodies, credentials or provider error bodies. */
@Service
@ConditionalOnProperty(
    prefix = "sutura.notifications.sms",
    name = "provider",
    havingValue = "jokoor")
public class JokoorSmsSender implements SmsSender {
  private final HttpClient client;
  private final ObjectMapper mapper;
  private final String apiKey;

  @Autowired
  public JokoorSmsSender(
      ObjectMapper mapper, @Value("${sutura.notifications.sms.jokoor.api-key}") String apiKey) {
    this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build(), mapper, apiKey);
  }

  JokoorSmsSender(HttpClient client, ObjectMapper mapper, String apiKey) {
    if (apiKey == null || !apiKey.startsWith("sk_live_") || apiKey.length() <= 8) {
      throw new IllegalArgumentException("Jokoor SMS requires a live API key");
    }
    this.client = client;
    this.mapper = mapper;
    this.apiKey = apiKey;
  }

  @Override
  public void send(String phoneNumber, String message) {
    try {
      var request =
          HttpRequest.newBuilder(URI.create("https://api.jokoor.com/v1/sms"))
              .timeout(Duration.ofSeconds(10))
              .header("Authorization", "Bearer " + apiKey)
              .header("Content-Type", "application/json")
              .POST(
                  HttpRequest.BodyPublishers.ofString(
                      mapper.writeValueAsString(
                          Map.of(
                              "recipient_phone", phoneNumber,
                              "message_body", message,
                              "is_draft", false))))
              .build();
      // Acceptance by Jokoor is not a handset delivery receipt. Do not retry an uncertain send.
      var response = client.send(request, HttpResponse.BodyHandlers.discarding());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new IllegalStateException("SMS provider rejected delivery");
      }
    } catch (InterruptedException failure) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("SMS delivery interrupted");
    } catch (Exception failure) {
      throw new IllegalStateException("SMS delivery unavailable");
    }
  }
}
