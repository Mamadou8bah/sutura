package com.mamadou.sutura.common.filter;

import com.mamadou.sutura.common.ratelimit.DistributedRateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * Per-IP rate limiting for authentication endpoints using Redis.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    @Value("${sutura.ratelimit.login.requests:10}")
    private int loginRequestsPerMinute;

    @Value("${sutura.ratelimit.refresh.requests:20}")
    private int refreshRequestsPerMinute;

    private final DistributedRateLimiter distributedRateLimiter;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String requestPath = request.getRequestURI();

        if (isRateLimitedEndpoint(requestPath)) {
            String clientIp = getClientIp(request);
            long rateLimit = getRateLimitForEndpoint(requestPath);
            String bucketKey = "ip:" + clientIp + ":" + endpointBucket(requestPath);

            if (!distributedRateLimiter.tryConsume(bucketKey, rateLimit, Duration.ofMinutes(1))) {
                response.setStatus(429);
                response.setHeader("Retry-After","60");
                response.setContentType("application/json");
                response.getWriter().write(
                        "{\"success\":false,\"message\":\"Rate limit exceeded. Try again in 1 minute.\"}"
                );
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimitedEndpoint(String path) {
        return path.contains("/api/auth/login")
                || path.contains("/api/auth/register")
                || path.startsWith("/api/auth/merchant/register")
                || path.startsWith("/api/auth/recovery/")
                || path.contains("/api/auth/refresh");
    }

    private long getRateLimitForEndpoint(String requestPath) {
        return requestPath.contains("/refresh") ? refreshRequestsPerMinute : loginRequestsPerMinute;
    }

    private String endpointBucket(String requestPath) {
        if (requestPath.contains("/refresh")) {
            return "auth-refresh";
        }
        if (requestPath.contains("/register")) {
            return "auth-register";
        }
        return "auth-login";
    }

    private String getClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (!isTrustedProxy(request.getRemoteAddr())) {
            return remoteAddr;
        }

        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return remoteAddr;
    }

    private boolean isTrustedProxy(String remoteAddr) {
        if ("127.0.0.1".equals(remoteAddr) || "::1".equals(remoteAddr)) {
            return true;
        }
        if (remoteAddr.startsWith("10.") || remoteAddr.startsWith("192.168.")) {
            return true;
        }
        if (remoteAddr.startsWith("172.")) {
            String[] parts = remoteAddr.split("\\.");
            if (parts.length >= 2) {
                try {
                    int second = Integer.parseInt(parts[1]);
                    return second >= 16 && second <= 31;
                } catch (NumberFormatException ignored) {
                    return false;
                }
            }
        }
        return false;
    }
}
