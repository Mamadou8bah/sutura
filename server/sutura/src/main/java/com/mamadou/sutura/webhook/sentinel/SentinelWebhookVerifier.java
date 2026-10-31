package com.mamadou.sutura.webhook.sentinel;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component @RequiredArgsConstructor
public class SentinelWebhookVerifier {
    private final SentinelWebhookProperties properties;
    @org.springframework.beans.factory.annotation.Value("${sutura.fraud-detection.connected:true}")
    private boolean connected = true;

    public void verify(String timestamp,String signature,byte[] payload) {
        if (!connected) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Sentinel is not connected yet");
        if (properties.getSigningSecret().length()<32 || properties.getTenantCode().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Sentinel callback is not configured");
        }
        try {
            long time=Long.parseLong(timestamp);
            long now=Instant.now().getEpochSecond();
            if (time<now-300 || time>now+300 || payload.length>65536) throw new IllegalArgumentException();
            Mac mac=Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(properties.getSigningSecret().getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            mac.update((timestamp+".").getBytes(StandardCharsets.UTF_8));
            if (!MessageDigest.isEqual(mac.doFinal(payload),HexFormat.of().parseHex(signature))) {
                throw new IllegalArgumentException();
            }
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid or expired Sentinel signature");
        }
    }
}
