# Multi-stage build for Sutura application
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy the JAR from builder stage
COPY --from=builder /build/target/sutura-*.jar app.jar
COPY --chmod=755 docker-entrypoint.sh /app/docker-entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1000 sutura && \
    adduser -D -u 1000 -G sutura sutura

# Create logs directory and set permissions
RUN mkdir -p /app/logs && \
    chown -R sutura:sutura /app

USER sutura

# Expose application port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/actuator/health/readiness || exit 1

# Set environment variables
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

# Run the application
ENTRYPOINT ["/app/docker-entrypoint.sh"]
