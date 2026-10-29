package com.mamadou.sutura.webhook.validator;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Component
public class WebhookSignatureValidator {

    private final String signingSecret;
    @Value("${sutura.webhooks.modempay.enabled:true}")
    private boolean enabled = true;

    public WebhookSignatureValidator(@Value("${sutura.webhooks.modempay.signing-secret:}") String signingSecret) {
        this.signingSecret = signingSecret;
    }

    public boolean isValid(String rawPayload, String signature) {
        if (!enabled) return false;
        if (signingSecret == null || signingSecret.isBlank()) {
            return false;
        }
        if (signature == null || signature.isBlank()) {
            return false;
        }

        String expectedSignature = hmacSha512(rawPayload);
        return MessageDigest.isEqual(
                normalize(signature).getBytes(StandardCharsets.UTF_8),
                expectedSignature.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String hmacSha512(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to validate webhook signature", ex);
        }
    }

    private String normalize(String signature) {
        String trimmed = signature.trim();
        if (trimmed.startsWith("sha512=")) {
            return trimmed.substring("sha512=".length());
        }
        return trimmed;
    }
}
