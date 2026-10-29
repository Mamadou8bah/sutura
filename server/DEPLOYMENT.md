# Production Deployment Guide

## Overview

This guide covers deploying Sutura to production using Docker, Docker Compose, and environment configuration.

## Quick Start with Docker

### 1. Build Docker Image

```bash
# Navigate to sutura directory
cd sutura

# Build the image
docker build -t sutura:latest .

# Or with a specific tag
docker build -t sutura:1.0.0 .
```

### 2. Run Container Locally

```bash
# Run with environment variables
docker run -d \
  --name sutura \
  -p 5000:5000 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/sutura \
  -e SPRING_DATASOURCE_USERNAME=postgres \
  -e SPRING_DATASOURCE_PASSWORD=your_password \
  -e REDIS_HOST=host.docker.internal \
  -e JWT_SECRET=your_jwt_secret_key \
  sutura:latest
```

### 3. Docker Compose for Full Stack

```bash
# Create .env file in root directory with required variables
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f sutura-app

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Environment Configuration

### Required Environment Variables

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/sutura
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_secure_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT (generate a secure random value)
JWT_SECRET=your_jwt_secret_min_32_chars_recommended
JWT_ACCESS_TOKEN_EXPIRATION_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRATION_DAYS=7

# Spring Profile
SPRING_PROFILES_ACTIVE=prod
```

### Optional Environment Variables

See `.env.example` for all available options including:
- Jokoor live SMS API key (`JOKOOR_API_KEY`)
- Email provider configuration
- Webhook signing secrets
- Risk management thresholds

## Application Profiles

### Development Profile (application.yaml)
- `spring.jpa.hibernate.ddl-auto=update`
- Debug logging enabled
- Swagger UI enabled
- Local development defaults

### Production Profile (application-prod.yaml)
- `spring.jpa.hibernate.ddl-auto=update`
- Structured logging with file rotation
- Swagger UI disabled
- External database connection pooling
- Graceful shutdown configuration
- Kubernetes health probes enabled

## Logging

### Development
- Logs to console (stdout) and `logs/sutura.log`
- Debug level for application code
- 10 MB max file size, 10 file history

### Production
- Logs to `/app/logs/sutura.log` (container mounted volume)
- Warn level for root, Info level for application
- 100 MB max file size, 30 file history, 10 GB total cap
- Structured JSON logging recommended with ELK stack

## Rate Limiting

Sutura implements advanced per-user and per-API-key rate limiting.

### Configuration (application.yaml)

```yaml
sutura:
  ratelimit:
    login:
      requests: 5
      window-seconds: 60
    refresh:
      requests: 10
      window-seconds: 60
    api-key:
      requests: 1000
      window-seconds: 3600
    default:
      requests: 100
      window-seconds: 60
```

### Using Rate Limits in Controllers

```java
import com.mamadou.sutura.common.ratelimit.RateLimit;

@RestController
@RequestMapping("/api/transfers")
public class TransferController {

    @PostMapping
    @RateLimit(value = "transfer", perUser = true)
    public ResponseEntity<TransferResponse> initiateTransfer(
            @RequestBody TransferRequest request) {
        // Method implementation
    }

    @PostMapping("/bulk")
    @RateLimit(
        value = "bulk-transfer", 
        perUser = true, 
        perApiKey = true
    )
    public ResponseEntity<List<TransferResponse>> bulkTransfer(
            @RequestBody List<TransferRequest> requests) {
        // Higher rate limit for API keys vs users
    }
}
```

### Rate Limiting Strategies

1. **Per-User**: Limited by user ID
   - Login: 5 requests/minute
   - Refresh: 10 requests/minute
   - Default: 100 requests/minute

2. **Per-API-Key**: For service-to-service communication
   - API Key: 1000 requests/hour
   - Provides higher throughput for server-side integration

3. **Per-Operation**: Different limits for different operations
   - Automatically extracted from configuration
   - Can be customized per endpoint

### Monitoring Rate Limits

```java
@Service
public class MonitoringService {
    
    private final RateLimitingService rateLimitingService;

    public void checkUserLimit(Long userId) {
        long remaining = rateLimitingService.getUserRemainingTokens(userId, "transfer");
        log.info("Remaining tokens for user {}: {}", userId, remaining);
    }
    
    public void resetUserLimit(Long userId) {
        rateLimitingService.resetUserLimit(userId, "transfer");
    }
}
```

## Health Checks

### Endpoints

```bash
# Application health
curl http://localhost:5000/actuator/health

# Detailed health (when authorized)
curl -H "Authorization: Bearer <token>" http://localhost:5000/actuator/health

# Prometheus metrics
curl http://localhost:5000/actuator/prometheus

# Liveness probe (Kubernetes)
curl http://localhost:5000/actuator/health/liveness

# Readiness probe (Kubernetes)
curl http://localhost:5000/actuator/health/readiness
```

### Docker Health Check

The Dockerfile includes a built-in health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/actuator/health || exit 1
```

## Database Migrations

### Strategy

- **Development**: `ddl-auto: update` - Auto-creates/updates schema
- **Production**: `ddl-auto: update` - Safe incremental updates

### Manual Migration

For future production releases, consider implementing Flyway or Liquibase:

```bash
# Planned for future releases
# Using Flyway for version control
```

## Deployment to Kubernetes

### Build and Push Image

```bash
# Build image
docker build -t your-registry/sutura:1.0.0 sutura/

# Push to registry
docker push your-registry/sutura:1.0.0
```

### Deploy to Kubernetes

See `.github/k8s/` for Kubernetes manifests (future implementation).

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs sutura-app

# Verify environment variables
docker inspect sutura-app | grep -i env

# Check database connection
docker exec sutura-app nc -zv postgres 5432
```

### Rate limiting not working

```bash
# Check if annotation is applied
# Verify interceptor is registered in WebMvcConfig
# Check logs for rate limit rejections: "Rate limit exceeded"
```

### High memory usage

```bash
# Adjust JVM heap in Dockerfile
# Current: 75% of container memory
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
```

## Performance Tuning

### Connection Pooling (HikariCP)

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20    # Adjust based on load
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
```

### Redis Lettuce Pool

```yaml
spring:
  redis:
    lettuce:
      pool:
        max-active: 20
        max-idle: 10
        min-idle: 5
```

### Tomcat Thread Pool

```yaml
server:
  tomcat:
    threads:
      max: 200
      min-spare: 10
    accept-count: 100
    max-connections: 10000
```

## Security Considerations

1. **Secrets Management**
   - Use environment variables for all secrets
   - Consider Azure Key Vault or HashiCorp Vault
   - Never commit `.env` files with real credentials

2. **HTTPS**
   - Enable SSL/TLS in production
   - Use certificates from Let's Encrypt or CA

3. **Network**
   - Use Docker networks to isolate services
   - Only expose necessary ports
   - Use firewall rules

4. **Database**
   - Use strong passwords
   - Enable PostgreSQL SSL connections
   - Regular backups

5. **Rate Limiting**
   - Protects against brute force attacks
   - Prevents DDoS attacks
   - Configured per-user and per-API-key

## Monitoring and Logging

### Prometheus Metrics

Access at: `http://localhost:5000/actuator/prometheus`

Key metrics:
- `http_server_requests_seconds`
- `auth_login_duration_seconds`
- `transfer_execution_duration_seconds`
- `risk_evaluation_duration_seconds`

### Centralized Logging (ELK Stack)

For production, forward logs to:
- Elasticsearch
- ELK Stack
- CloudWatch
- Datadog
- New Relic

Update logging configuration for JSON format in production:

```yaml
logging:
  pattern:
    console: "%d{ISO8601} [%thread] %-5level %logger{36} - %msg%n"
  # Add JSON encoder for ELK integration
```

## Backup and Recovery

### Database Backup

```bash
# Backup PostgreSQL
docker exec sutura-postgres pg_dump -U postgres sutura > backup.sql

# Restore PostgreSQL
docker exec -i sutura-postgres psql -U postgres sutura < backup.sql
```

### Redis Backup

Redis data is persisted via `redis_data` volume. Regular backups of this volume are recommended.

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review health endpoints: `http://localhost:5000/actuator/health`
- Check rate limits: `curl http://localhost:5000/actuator/metrics/rate_limit.requests`

## Sentinel compliance dependency

Run Sentinel separately and configure `SUTURA_SENTINEL_BASE_URL` and
`SUTURA_SENTINEL_API_KEY` before starting the production Compose stack.
The API key must belong to the Sutura tenant. Review, block, invalid responses
and unreachable scoring stop the current pre-execution path. See
[the integration contract](../docs/sentinel-integration.md) for configuration
and the remaining durable-review and settlement work.
