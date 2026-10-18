package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.common.ratelimit.DistributedRateLimiter;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

class RateLimiterDeploymentTest {
  @Test
  void productionDeniesRequestsWhenRedisIsUnavailable() {
    var redis = mock(StringRedisTemplate.class);
    var limiter = new DistributedRateLimiter(redis);
    ReflectionTestUtils.setField(limiter, "failOpen", false);
    when(redis.execute(
            any(org.springframework.data.redis.core.script.RedisScript.class), anyList(), any()))
        .thenThrow(new IllegalStateException("unavailable"));
    assertFalse(limiter.tryConsume("auth", 5, Duration.ofMinutes(1)));
  }

  @Test
  void localDevelopmentCanExplicitlyFailOpen() {
    var redis = mock(StringRedisTemplate.class);
    var limiter = new DistributedRateLimiter(redis);
    assertTrue(limiter.tryConsume("auth", 5, Duration.ofMinutes(1)));
  }
}
