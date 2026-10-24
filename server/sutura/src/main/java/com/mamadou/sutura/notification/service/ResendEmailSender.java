package com.mamadou.sutura.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/** HTTPS email transport for hosts that block SMTP. Never include provider bodies in errors. */
@Service
@ConditionalOnProperty(
    prefix = "sutura.notifications.email",
    name = "provider",
    havingValue = "resend")
public class ResendEmailSender implements EmailSender {
  private final HttpClient client;
  private final ObjectMapper mapper;
  private final String apiKey, from;

  @Autowired
  public ResendEmailSender(
      ObjectMapper mapper,
      @Value("${sutura.notifications.email.api-key}") String apiKey,
      @Value("${sutura.notifications.email.from}") String from) {
    this(
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build(),
        mapper,
        apiKey,
        from);
  }

  ResendEmailSender(HttpClient client, ObjectMapper mapper, String apiKey, String from) {
    this.client = client;
    this.mapper = mapper;
    this.apiKey = apiKey;
    this.from = from;
  }

  @Override
  public void send(String email, String subject, String body) {
    try {
      var request =
          HttpRequest.newBuilder(URI.create("https://api.resend.com/emails"))
              .timeout(Duration.ofSeconds(10))
              .header("Authorization", "Bearer " + apiKey)
              .header("Content-Type", "application/json")
              .POST(
                  HttpRequest.BodyPublishers.ofString(
                      mapper.writeValueAsString(
                          Map.of(
                              "from",
                              from,
                              "to",
                              List.of(email),
                              "subject",
                              subject,
                              "text",
                              body))))
              .build();
      var response = client.send(request, HttpResponse.BodyHandlers.discarding());
      if (response.statusCode() < 200 || response.statusCode() >= 300)
        throw new IllegalStateException("Email provider rejected delivery");
    } catch (InterruptedException failure) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Email delivery interrupted");
    } catch (Exception failure) {
      throw new IllegalStateException("Email delivery unavailable");
    }
  }
}
