package com.mamadou.sutura.common.ratelimit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Redis-backed token bucket approximation for distributed rate limiting across replicas.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DistributedRateLimiter {

    private static final String KEY_PREFIX = "sutura:ratelimit:";

    private final StringRedisTemplate redisTemplate;
    @org.springframework.beans.factory.annotation.Value("${sutura.ratelimit.fail-open:true}")
    private boolean failOpen=true;
    private static final org.springframework.data.redis.core.script.DefaultRedisScript<Long> INCREMENT =
        new org.springframework.data.redis.core.script.DefaultRedisScript<>(
            "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; return n",Long.class);

    public boolean tryConsume(String bucketKey, long limit, Duration window) {
        String redisKey = KEY_PREFIX + bucketKey;
        try {
            Long count = redisTemplate.execute(INCREMENT,java.util.List.of(redisKey),String.valueOf(window.toMillis()));
            if(count==null)return failOpen;
            boolean allowed = count <= limit;
            if (!allowed) {
                log.warn("Rate limit exceeded for key={} count={} limit={}", bucketKey, count, limit);
            }
            return allowed;
        } catch (Exception ex) {
            log.error("Redis rate limit check failed for key={}: {}", bucketKey, ex.getMessage());
            return failOpen;
        }
    }
}
