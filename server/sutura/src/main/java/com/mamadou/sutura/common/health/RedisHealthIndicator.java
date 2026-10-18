package com.mamadou.sutura.common.health;

import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

/** A real Actuator contributor: Redis failure removes the API from readiness. */
@Component
public class RedisHealthIndicator implements HealthIndicator {
  private final RedisConnectionFactory connections;

  public RedisHealthIndicator(RedisConnectionFactory connections) {
    this.connections = connections;
  }

  @Override
  public Health health() {
    return isRedisHealthy() ? Health.up().build() : Health.down().build();
  }

  public boolean isRedisHealthy() {
    try (var connection = connections.getConnection()) {
      return "PONG".equalsIgnoreCase(connection.ping());
    } catch (Exception error) {
      return false;
    }
  }
}
