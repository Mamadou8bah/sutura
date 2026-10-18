package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.common.health.RedisHealthIndicator;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;

class RedisHealthDeploymentTest {
  @Test
  void failedRedisMakesReadinessDownAndClosesConnection() {
    var factory = mock(RedisConnectionFactory.class);
    var connection = mock(RedisConnection.class);
    when(factory.getConnection()).thenReturn(connection);
    when(connection.ping()).thenThrow(new IllegalStateException("unavailable"));
    assertEquals("DOWN", new RedisHealthIndicator(factory).health().getStatus().getCode());
    verify(connection).close();
  }

  @Test
  void successfulPingMakesReadinessUp() {
    var factory = mock(RedisConnectionFactory.class);
    var connection = mock(RedisConnection.class);
    when(factory.getConnection()).thenReturn(connection);
    when(connection.ping()).thenReturn("PONG");
    assertEquals("UP", new RedisHealthIndicator(factory).health().getStatus().getCode());
    verify(connection).close();
  }
}
