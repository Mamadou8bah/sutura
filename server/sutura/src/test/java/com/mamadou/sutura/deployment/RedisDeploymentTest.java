package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import com.mamadou.sutura.common.ratelimit.DistributedRateLimiter;
import java.time.Duration;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

@EnabledIfEnvironmentVariable(named = "REDIS_TEST_PORT", matches = "[0-9]+")
class RedisDeploymentTest {
  @Test
  void parallelRequestsShareOneAtomicExpiringLimit() throws Exception {
    var config =
        new RedisStandaloneConfiguration(
            "127.0.0.1", Integer.parseInt(System.getenv("REDIS_TEST_PORT")));
    String password = System.getenv("REDIS_TEST_PASSWORD");
    if (password != null && !password.isBlank()) config.setPassword(password);
    var factory = new LettuceConnectionFactory(config);
    factory.afterPropertiesSet();
    factory.start();
    var template = new StringRedisTemplate(factory);
    template.afterPropertiesSet();
    var limiter = new DistributedRateLimiter(template);
    org.springframework.test.util.ReflectionTestUtils.setField(limiter, "failOpen", false);
    String key = "deployment-test:" + java.util.UUID.randomUUID();
    var executor = Executors.newFixedThreadPool(10);
    try {
      var futures = new java.util.ArrayList<Future<Boolean>>();
      for (int i = 0; i < 50; i++)
        futures.add(executor.submit(() -> limiter.tryConsume(key, 10, Duration.ofMinutes(1))));
      int allowed = 0;
      for (var future : futures) if (future.get(10, TimeUnit.SECONDS)) allowed++;
      assertEquals(10, allowed);
      assertTrue(template.getExpire("sutura:ratelimit:" + key) > 0);
    } finally {
      executor.shutdownNow();
      template.delete("sutura:ratelimit:" + key);
      factory.destroy();
    }
  }
}
