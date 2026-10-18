package com.mamadou.sutura.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
@Service
@ConditionalOnProperty(prefix = "sutura.notifications.sms", name = "provider", havingValue = "twilio")
public class TwilioSmsSender implements SmsSender {

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build();
    private final String accountSid;
    private final String authToken;
    private final String fromNumber;

    public TwilioSmsSender(
            @Value("${sutura.notifications.sms.twilio.account-sid}") String accountSid,
            @Value("${sutura.notifications.sms.twilio.auth-token}") String authToken,
            @Value("${sutura.notifications.sms.twilio.from-number}") String fromNumber
    ) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.fromNumber = fromNumber;
    }

    @Override
    public void send(String phoneNumber, String message) {
        String body = formEncode("From", fromNumber)
                + "&" + formEncode("To", phoneNumber)
                + "&" + formEncode("Body", message);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json"))
                .timeout(java.time.Duration.ofSeconds(10))
                .header("Authorization", "Basic " + basicAuth())
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Twilio SMS delivery failed with status {}", response.statusCode());
                throw new IllegalStateException("Unable to send verification SMS");
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to send verification SMS", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to send verification SMS", ex);
        }
    }

    private String basicAuth() {
        return Base64.getEncoder()
                .encodeToString((accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8));
    }

    private String formEncode(String key, String value) {
        return URLEncoder.encode(key, StandardCharsets.UTF_8)
                + "="
                + URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
