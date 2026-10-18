package com.mamadou.sutura.common.ratelimit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Distributed rate limiting for per-user and per-API-key quotas.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RateLimitingService {

    private final DistributedRateLimiter distributedRateLimiter;
    private final RateLimitConfig rateLimitConfig;

    public boolean isUserAllowed(Long userId, String operation) {
        String key = "user:" + userId + ":" + operation;
        long requests = rateLimitConfig.getLimit(operation);
        long windowSeconds = rateLimitConfig.getWindowSeconds(operation);
        return distributedRateLimiter.tryConsume(key, requests, Duration.ofSeconds(windowSeconds));
    }

    public boolean isApiKeyAllowed(String apiKey, String operation) {
        String key = "apikey:" + keyFingerprint(apiKey) + ":" + operation;
        long requests = rateLimitConfig.getApiKeyLimit(operation);
        long windowSeconds = rateLimitConfig.getWindowSeconds(operation);
        return distributedRateLimiter.tryConsume(key, requests, Duration.ofSeconds(windowSeconds));
    }

    private String keyFingerprint(String key) {
        try{return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(key.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
        catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException("SHA-256 unavailable",e);}
    }

    public long getUserRemainingTokens(Long userId, String operation) {
        return rateLimitConfig.getLimit(operation);
    }

    public long getApiKeyRemainingTokens(String apiKey, String operation) {
        return rateLimitConfig.getApiKeyLimit(operation);
    }

    public void resetUserLimit(Long userId, String operation) {
        log.info("Rate limit reset requested for user={} operation={} (Redis keys expire automatically)", userId, operation);
    }

    public void resetApiKeyLimit(String apiKey, String operation) {
        log.info("Rate limit reset requested for key fingerprint={} operation={} (Redis keys expire automatically)", keyFingerprint(apiKey), operation);
    }

    @org.springframework.boot.context.properties.ConfigurationProperties(prefix = "sutura.ratelimit")
    public static class RateLimitConfig {

        private Map<String, RateLimitRule> rules = new ConcurrentHashMap<>();
        private RateLimitRule login;
        private RateLimitRule refresh;
        private RateLimitRule apiKey;
        private RateLimitRule defaultRule;

        public RateLimitRule getRule(String operation) {
            return rules.getOrDefault(operation, defaultRule != null ? defaultRule :
                    new RateLimitRule(100, 60, 1000, 3600));
        }

        public long getLimit(String operation) {
            return getRule(operation).getRequests();
        }

        public long getApiKeyLimit(String operation) {
            return getRule(operation).getApiKeyRequests();
        }

        public long getWindowSeconds(String operation) {
            return getRule(operation).getWindowSeconds();
        }

        public Map<String, RateLimitRule> getRules() {
            return rules;
        }

        public void setRules(Map<String, RateLimitRule> rules) {
            this.rules = rules;
        }

        public RateLimitRule getLogin() {
            return login;
        }

        public void setLogin(RateLimitRule login) {
            this.login = login;
            if (login != null) {
                rules.put("login", login);
            }
        }

        public RateLimitRule getRefresh() {
            return refresh;
        }

        public void setRefresh(RateLimitRule refresh) {
            this.refresh = refresh;
            if (refresh != null) {
                rules.put("refresh", refresh);
            }
        }

        public RateLimitRule getApiKey() {
            return apiKey;
        }

        public void setApiKey(RateLimitRule apiKey) {
            this.apiKey = apiKey;
            if (apiKey != null) {
                rules.put("api-key", apiKey);
            }
        }

        public RateLimitRule getDefault() {
            return defaultRule;
        }

        public void setDefault(RateLimitRule defaultRule) {
            this.defaultRule = defaultRule;
        }
    }

    public static class RateLimitRule {
        private long requests;
        private long windowSeconds;
        private long apiKeyRequests;
        private long apiKeyWindowSeconds;

        public RateLimitRule() {
        }

        public RateLimitRule(long requests, long windowSeconds, long apiKeyRequests, long apiKeyWindowSeconds) {
            this.requests = requests;
            this.windowSeconds = windowSeconds;
            this.apiKeyRequests = apiKeyRequests;
            this.apiKeyWindowSeconds = apiKeyWindowSeconds;
        }

        public long getRequests() {
            return requests;
        }

        public void setRequests(long requests) {
            this.requests = requests;
        }

        public long getWindowSeconds() {
            return windowSeconds;
        }

        public void setWindowSeconds(long windowSeconds) {
            this.windowSeconds = windowSeconds;
        }

        public long getApiKeyRequests() {
            return apiKeyRequests;
        }

        public void setApiKeyRequests(long apiKeyRequests) {
            this.apiKeyRequests = apiKeyRequests;
        }

        public long getApiKeyWindowSeconds() {
            return apiKeyWindowSeconds;
        }

        public void setApiKeyWindowSeconds(long apiKeyWindowSeconds) {
            this.apiKeyWindowSeconds = apiKeyWindowSeconds;
        }
    }
}
