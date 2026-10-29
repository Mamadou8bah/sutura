# Sutura - Payment Processing Platform

A comprehensive, high-performance payment processing platform built with Spring Boot 4.0.4, designed to handle complex financial transactions, wallet management, risk assessment, and reconciliation at scale.

For the production Render deployment, configuration, migrations and first administrator, follow [Deploy Sutura on Render](../docs/deploy-render.md). The root `render.yaml` is the deployment definition; production uses Flyway and schema validation, not Hibernate schema updates.

## [CONTENTS] Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Architecture & Design](#architecture--design)
- [Concurrency & Performance](#concurrency--performance)
- [Modem Pay Webhook Integration](#modem-pay-webhook-integration)
- [Development Guidelines](#development-guidelines)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

Sutura is an enterprise-grade payment processing platform that provides:

- **[AUTH] Secure Authentication & Authorization**: JWT-based auth with API key support and refresh tokens
- **[WALLET] Wallet Management**: Multi-currency wallet support with KYC levels and transaction limits
- **[RISK] Risk Assessment**: Real-time transaction risk evaluation with configurable rules
- **[LEDGER] Financial Ledger**: Double-entry accounting system for all financial transactions
- **[RECONCILE] Reconciliation Engine**: Automated wallet-to-ledger consistency checking
- **[TRANSFER] Transfer Management**: Atomic transfer execution with ledger recording
- **[WEBHOOK] Webhook Integration**: Event-driven architecture with ModemPay webhook support
- **[NOTIFY] Notifications**: Multi-channel notifications (SMS, Email) with provider abstraction
- **[AUDIT] Audit Trail**: Comprehensive audit logging for compliance and debugging
- **[ADMIN] Admin Dashboard**: Administrative controls and user management
- **[METRICS] Metrics & Monitoring**: Prometheus metrics and health checks for production monitoring

## Features

### [SECURITY] Security
- JWT-based authentication with configurable expiration
- API Key management for service-to-service communication
- Refresh token mechanism for improved security
- Spring Security integration with role-based access control
- Request validation and sanitization
- Global exception handling with security considerations

### [WALLET] Wallet Management
- Create and manage user wallets
- Real-time balance tracking
- KYC level verification (Level 0-5)
- Transaction limits based on KYC levels
- Wallet status management (ACTIVE, SUSPENDED, CLOSED)
- Wallet transaction history

### [LEDGER] Financial Ledger
- Double-entry accounting system
- Transaction categorization and tagging
- Debit/credit management
- Ledger posting with balance tracking
- Transaction reconciliation support

### [ANALYTICS] Risk Assessment
- Real-time transaction risk scoring
- Configurable risk rules (CRITICAL, HIGH, MEDIUM, LOW)
- Parallel rule evaluation for performance
- Rule-based blocking and approval workflows
- Risk metrics and dashboard

### [TRANSFER] Transfer Management
- Atomic transfer operations
- Concurrent transfer execution
- Ledger integration for financial tracking

## Feature Support: Consumer & Developer

This project exposes both consumer-facing wallet features and developer APIs for integrations.

Consumer Side
- Send money between wallets (`/api/v1/transfers`)
- Receive money via deposits (`/api/v1/deposits`) and payment links (`/api/v1/payment-links`)
- Transfer between wallets (`/api/v1/transfers`)
- Pay merchants using payment links or merchant checkout (`/api/v1/payment-links`, ModemPay integration)
- Pay bills (use `payment-links` or collections APIs)

Merchant Side
- Accept payments online via `PaymentLink` and ModemPay
- Generate payment links: `POST /api/v1/payment-links`
- Track transactions: `/api/v1/transactions` and `/api/v1/wallets/{id}/transactions`
- Automate invoices / subscriptions: `POST /api/v1/subscriptions`
- Receive payouts (withdrawals): `POST /api/v1/withdrawals`

Developer Side (APIs)
- Collections (create charges): `POST /api/v1/deposits`
- Payouts (create payouts): `POST /api/v1/withdrawals`
- Wallet creation and management: `POST /api/v1/wallets`, `/api/v1/wallets/{id}/balance`
- Transaction verification and queries: `GET /api/v1/transactions/reference?reference=...` and `GET /api/v1/transactions/{id}`
- Subscriptions: `POST /api/v1/subscriptions`, `GET /api/v1/subscriptions`
- Webhooks: endpoints under `/api/v1/webhooks/*` for provider callbacks and replay

Notes:
- All financial actions create `Transaction` records and use the ledger service for double-entry postings on provider confirmations.
- Idempotency and integration tests are still pending; prioritize before production deployment.
- Transfer status management
- Batch transfer processing

### [WEBHOOK] Webhook Management
- Event-driven architecture
- ModemPay webhook integration
- Signature validation (HMAC)
- Reliable event delivery
- Event retry mechanisms

### [NOTIFICATIONS] Notifications
- SMS notifications (Jokoor integration)
- Email notifications
- Provider abstraction for easy switching
- Template-based message formatting
- Async notification processing

### [AUDIT] Audit & Compliance
- Automatic entity auditing (CreatedBy, ModifiedBy, timestamps)
- Audit log tracking
- Correlation ID tracking for request tracing
- Comprehensive logging

### [ADMIN] Admin & Monitoring
- Admin user management
- Health checks
- Prometheus metrics
- Application info endpoint
- System metrics (JVM, process, system, Tomcat)

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Spring Boot | 4.0.4 |
| Language | Java (OpenJDK) | 17+ |
| Database | PostgreSQL | 15+ |
| Cache | Redis | 7.0+ |
| ORM/Persistence | Hibernate JPA | 6.2+ |
| Build Tool | Maven | 3.8+ |
| Authentication | Spring Security | 6.2+ |
| JSON Processing | Jackson | 2.15+ |
| Validation | Jakarta Bean Validation | 3.0+ |

### Additional Libraries
- **Lombok**: Reducing boilerplate code
- **Jackson**: JSON processing and mapping
- **Thymeleaf**: Server-side templating (if needed)
- **Spring Data JPA**: Database abstraction
- **Docker Compose**: Local development environment orchestration

## Project Structure

```
sutura/
├── src/
│   ├── main/
│   │   ├── java/com/mamadou/sutura/
│   │   │   ├── SuturaApplication.java          # Main application class
│   │   │   ├── admin/                           # Admin module
│   │   │   │   ├── controller/
│   │   │   │   ├── dto/
│   │   │   │   └── service/
│   │   │   ├── audit/                           # Audit logging module
│   │   │   │   ├── entity/
│   │   │   │   ├── repository/
│   │   │   │   └── service/
│   │   │   ├── auth/                            # Authentication & Authorization
│   │   │   │   ├── controller/
│   │   │   │   ├── dto/
│   │   │   │   ├── entity/
│   │   │   │   ├── mapper/
│   │   │   │   ├── repository/
│   │   │   │   └── service/
│   │   │   ├── common/                          # Shared utilities & config
│   │   │   │   ├── auditing/                    # JPA Auditing configuration
│   │   │   │   ├── config/                      # Spring configurations
│   │   │   │   │   ├── SecurityConfig.java
│   │   │   │   │   ├── AsyncConfig.java
│   │   │   │   │   ├── CacheConfig.java
│   │   │   │   │   ├── JacksonConfig.java
│   │   │   │   │   └── AsyncConfiguration.java
│   │   │   │   ├── filter/                      # HTTP filters
│   │   │   │   ├── health/                      # Health checks
│   │   │   │   ├── metrics/                     # Metrics initialization
│   │   │   │   ├── exception/                   # Exception handling
│   │   │   │   ├── response/                    # Response wrappers
│   │   │   │   └── util/                        # Utility classes
│   │   │   ├── ledger/                          # Financial Ledger Module
│   │   │   │   ├── dto/
│   │   │   │   ├── entity/
│   │   │   │   ├── enums/
│   │   │   │   ├── exception/
│   │   │   │   ├── mapper/
│   │   │   │   ├── repository/
│   │   │   │   └── service/
│   │   │   ├── notification/                    # Notification Module
│   │   │   │   ├── dto/
│   │   │   │   └── service/
│   │   │   ├── reconciliation/                  # Reconciliation Engine
│   │   │   │   ├── controller/
│   │   │   │   ├── dto/
│   │   │   │   ├── entity/
│   │   │   │   ├── enums/
│   │   │   │   ├── job/
│   │   │   │   ├── repository/
│   │   │   │   └── service/
│   │   │   ├── risk/                            # Risk Assessment Module
│   │   │   │   ├── controller/
│   │   │   │   ├── dto/
│   │   │   │   ├── entity/
│   │   │   │   ├── enums/
│   │   │   │   ├── repository/
│   │   │   │   ├── rules/                       # Risk rule implementations
│   │   │   │   └── service/
│   │   │   ├── transaction/                     # Transaction Module
│   │   │   │   ├── controller/
│   │   │   │   ├── dto/
│   │   │   │   ├── entity/
│   │   │   │   ├── enums/
│   │   │   │   ├── exception/
│   │   │   │   ├── repository/
│   │   │   │   └── service/
│   │   │   ├── transfer/                        # Transfer Management Module
│   │   │   │   ├── controller/
│   │   │   │   ├── dto/
│   │   │   │   ├── entity/
│   │   │   │   ├── enums/
│   │   │   │   ├── repository/
│   │   │   │   └── service/
│   │   │   ├── user/                            # User Management Module
│   │   │   │   ├── entity/
│   │   │   │   ├── repository/
│   │   │   │   └── service/
│   │   │   ├── wallet/                          # Wallet Management Module
│   │   │   │   ├── api/
│   │   │   │   ├── dto/
│   │   │   │   ├── entity/
│   │   │   │   ├── enums/
│   │   │   │   ├── exception/
│   │   │   │   ├── repository/
│   │   │   │   └── service/
│   │   │   └── webhook/                         # Webhook Integration
│   │   │       ├── controller/
│   │   │       ├── dto/
│   │   │       ├── entity/
│   │   │       ├── enums/
│   │   │       ├── exception/
│   │   │       ├── repository/
│   │   │       ├── service/
│   │   │       └── validation/
│   │   └── resources/
│   │       ├── application.yaml                 # Main configuration
│   │       ├── static/                          # Static resources
│   │       └── templates/                       # Thymeleaf templates
│   └── test/
│       └── java/com/mamadou/sutura/            # Test classes
├── pom.xml                                      # Maven configuration
├── mvnw & mvnw.cmd                              # Maven wrapper scripts
├── docker-compose.yml                           # Local dev environment
├── compose.yaml                                 # Alternative compose file
├── CONCURRENCY_GUIDE.md                         # Concurrency implementation details
├── HELP.md                                      # Spring Boot help
└── README.md                                    # This file
```

## Prerequisites

### Required
- **Java Development Kit (JDK)**: Version 17 or higher
- **Maven**: Version 3.8.1 or higher
- **PostgreSQL**: Version 15 or higher
- **Redis**: Version 7.0 or higher (optional, for caching)
- **Git**: For version control

### Optional
- **Docker**: For containerized local development
- **Docker Compose**: For orchestrating local services
- **Postman/Insomnia**: For API testing
- **IDE**: IntelliJ IDEA or VS Code recommended

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Mamadou8bah/sutura-server.git sutura-server
cd sutura-server
```

### Step 2: Set Up Local Database

#### Using Docker Compose (Recommended)
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432 (default credentials: postgres/bah12)
- Redis on port 6379

#### Manual Setup
```bash
# Create PostgreSQL database
createdb sutura

# Or using psql
psql -U postgres
CREATE DATABASE sutura;
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/sutura
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=bah12

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=ZGV2ZWxvcG1lbnQtc2VjcmV0LWtleS1mb3ItcGF5Zmxvdy1hcHAtMzItYnl0ZXM=
JWT_ACCESS_TOKEN_EXPIRATION_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRATION_DAYS=7

# Jokoor (SMS Notifications; live keys required)
JOKOOR_API_KEY=sk_live_your_key_here

# Email Configuration (Resend)
SUTURA_EMAIL_PROVIDER=resend
SUTURA_EMAIL_API_KEY=your_email_api_key
SUTURA_EMAIL_FROM=no-reply@sutura.local

# Webhook Configuration
MODEMPAY_WEBHOOK_SIGNING_SECRET=your_webhook_secret
MODEMPAY_WEBHOOK_SIGNATURE_HEADER=X-ModemPay-Signature

# Risk Management
SUTURA_RISK_CRITICAL_THRESHOLD=9.0
SUTURA_RISK_HIGH_THRESHOLD=7.0
SUTURA_RISK_MEDIUM_THRESHOLD=5.0

# SMS Provider
SUTURA_SMS_PROVIDER=noop  # or 'jokoor' for production
```

### Step 4: Build the Project

```bash
# Using Maven wrapper
./mvnw clean install

# Or using installed Maven
mvn clean install
```

## Configuration

### Application Properties (application.yaml)

Key configuration sections:

#### Server
- **Port**: 5000 (configurable via `server.port`)

#### Database
- **URL**: `jdbc:postgresql://localhost:5432/sutura`
- **DDL**: `create` (drops/recreates schema on startup)

#### Redis Cache
- **TTL**: 10 minutes (600000 ms)
- **Type**: Redis

#### JWT
- **Access Token Expiration**: 15 minutes
- **Refresh Token Expiration**: 7 days

#### Notifications
- **SMS Provider**: Configurable (noop, jokoor)
- **Email Provider**: Configurable

#### Risk Management
- **Critical Threshold**: 9.0
- **High Threshold**: 7.0
- **Medium Threshold**: 5.0

#### Rate Limiting
- **Login**: 10 requests per 60 seconds
- **Refresh Token**: 20 requests per 60 seconds

#### Monitoring
- **Metrics Exposure**: health, metrics, prometheus, info
- **Logging Level**: INFO (root), DEBUG (sutura package)

## Running the Application

### Step 1: Start PostgreSQL and Redis

```bash
# Using Docker Compose
docker-compose up -d

# Or start services individually
docker run -d -p 5432:5432 --name postgres -e POSTGRES_PASSWORD=bah12 postgres:15
docker run -d -p 6379:6379 --name redis redis:7
```

### Step 2: Run the Application

```bash
# Using Maven wrapper
./mvnw spring-boot:run

# Or build and run the JAR
./mvnw clean package
java -jar target/sutura-0.0.1-SNAPSHOT.jar
```

### Step 3: Verify Application is Running

```bash
# Health check
curl http://localhost:5000/actuator/health

# Application info
curl http://localhost:5000/actuator/info

# Metrics
curl http://localhost:5000/actuator/metrics
```

## API Endpoints

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "securePassword123"
}

Response:
{
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "expiresIn": 900
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

### Wallet Endpoints

#### Create Wallet
```http
POST /api/wallets
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currency": "USD",
  "kycLevel": 2
}
```

#### Get Wallet Balance
```http
GET /api/wallets/{walletId}/balance
Authorization: Bearer {accessToken}

Response:
{
  "walletId": "uuid",
  "balance": 5000.00,
  "currency": "USD",
  "lastUpdated": "2024-05-28T10:30:00Z"
}
```

#### Update Wallet Limits
```http
PUT /api/wallets/{walletId}/limits
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "dailyLimit": 10000.00,
  "monthlyLimit": 100000.00,
  "transactionLimit": 5000.00
}
```

### Transfer Endpoints

#### Execute Transfer
```http
POST /api/transfers
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fromWalletId": "uuid",
  "toWalletId": "uuid",
  "amount": 100.00,
  "description": "Payment for services"
}

Response:
{
  "transferId": "uuid",
  "status": "COMPLETED",
  "fromWallet": "uuid",
  "toWallet": "uuid",
  "amount": 100.00,
  "createdAt": "2024-05-28T10:30:00Z"
}
```

#### Get Transfer Status
```http
GET /api/transfers/{transferId}
Authorization: Bearer {accessToken}
```

### Transaction Endpoints

#### Create Transaction
```http
POST /api/transactions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "walletId": "uuid",
  "type": "DEBIT",
  "amount": 50.00,
  "description": "Purchase",
  "reference": "TXN-2024-001"
}
```

#### Get Transaction History
```http
GET /api/transactions?walletId={walletId}&limit=20&offset=0
Authorization: Bearer {accessToken}
```

### Ledger Endpoints

#### Get Account Balance
```http
GET /api/ledger/accounts/{accountId}/balance
Authorization: Bearer {accessToken}
```

#### Post Ledger Entry
```http
POST /api/ledger/entries
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "accountId": "uuid",
  "debitAmount": 100.00,
  "creditAmount": 0.00,
  "description": "Deposit",
  "reference": "TXN-2024-001"
}
```

### Risk Assessment Endpoints

#### Evaluate Transaction Risk
```http
POST /api/risk/evaluate
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "transactionId": "uuid",
  "amount": 1000.00,
  "walletId": "uuid",
  "recipientId": "uuid"
}

Response:
{
  "riskScore": 6.5,
  "riskLevel": "HIGH",
  "rules": [
    {
      "ruleName": "Velocity Check",
      "riskScore": 3.0
    },
    {
      "ruleName": "Amount Threshold",
      "riskScore": 3.5
    }
  ],
  "recommended_action": "REVIEW"
}
```

### Admin Endpoints

#### Get All Users
```http
GET /api/admin/users
Authorization: Bearer {adminAccessToken}
```

#### Suspend User
```http
PUT /api/admin/users/{userId}/suspend
Authorization: Bearer {adminAccessToken}
```

#### Get Audit Logs
```http
GET /api/admin/audit-logs?entity=User&limit=50
Authorization: Bearer {adminAccessToken}
```

### Health & Monitoring

#### Application Health
```http
GET /actuator/health
```

#### Prometheus Metrics
```http
GET /actuator/prometheus
```

#### Application Info
```http
GET /actuator/info
```

## Architecture & Design

### [ARCHITECTURE] System Architecture Overview

Sutura implements a comprehensive, multi-layered architecture optimized for high-throughput payment processing:

```
┌─────────────────────────────────────────────────────────────────┐
│                  CLIENT LAYER                                    │
│     Web Apps │ Mobile Apps │ Third-party Services               │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│            API GATEWAY & LOAD BALANCER                           │
│         (Request Routing, Rate Limiting, Auth)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
  [REST-API]      [AUTH-FILTER]    [WEBHOOK-HANDLER]
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              PRESENTATION LAYER                                  │
│    REST Controllers │ Exception Handlers │ Request Filters      │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              SERVICE LAYER (Business Logic)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  AuthService  │ WalletService │ RiskEngineService       │  │
│  │  TransferService │ LedgerService │ ReconciliationService│  │
│  │  WebhookService  │ NotificationService │ AuditService   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              PERSISTENCE LAYER                                   │
│    JPA Repositories │ Custom Queries │ Data Access Objects      │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
  [POSTGRESQL]    [REDIS CACHE]    [ASYNC EXECUTORS]
   [Database]     [10-min TTL]    [Thread Pools]
        │                │                │
        └────────────────┼────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              DATA & INTEGRATION LAYER                            │
│  PostgreSQL │ Redis │ Jokoor │ Email │ ModemPay │ External APIs│
└─────────────────────────────────────────────────────────────────┘
```

### [LAYERS] Detailed Layered Architecture

```
        [PRESENTATION LAYER]
        REST Controllers (HTTP Handlers)
        - Request validation with @Valid
        - Response mapping to DTOs
        - HTTP status codes
              ↓
        [SERVICE LAYER]
        Business Logic & Orchestration
        - Core application logic
        - Service-to-service coordination
        - Async operation management
        - Transaction handling
              ↓
        [REPOSITORY LAYER]
        Data Access Abstraction
        - JPA entity management
        - Custom query execution
        - Transaction boundaries
              ↓
        [ENTITY LAYER]
        Domain Models & Persistence
        - JPA annotated entities
        - Relationship mappings
        - Validation constraints
              ↓
        [DATA STORE LAYER]
        Actual Storage & Retrieval
        PostgreSQL │ Redis │ External Services
```

### [FLOW] Request Processing Flow

```
User Request (HTTP)
       │
       ▼
    Load Balancer
       │
       ├─► Rate Limiting Check
       │   (Login: 10/60s, Refresh: 20/60s)
       │
       ├─► JWT Authentication
       │   (Validate token, extract claims)
       │
       ├─► Authorization Check
       │   (Verify role/permissions)
       │
       ├─► Route to Controller
       │
       ▼
  REST Controller
       │
       ├─► @Valid annotation
       │   (Constraint validation)
       │
       ├─► Request DTO Binding
       │
       ├─► Call Service Layer
       │
       ▼
   Service Layer
       │
       ├─► Business Logic Processing
       │   (Multiple services may interact)
       │
       ├─► Check Cache (Redis)
       │   (If not found, proceed to DB)
       │
       ├─► Repository Call
       │
       ▼
  Repository Layer
       │
       ├─► Execute JPA Query
       │
       ├─► Database Interaction
       │   (PostgreSQL)
       │
       ├─► Update Cache (Redis)
       │
       ▼
   Return Entity to Service
       │
       ├─► Post-processing
       │
       ├─► Async Tasks (if any)
       │   (Notifications, Webhooks)
       │
       ├─► Convert to DTO
       │
       ▼
   Return to Controller
       │
       ├─► Wrap in ApiResponse
       │
       ├─► Set HTTP Headers
       │
       ▼
   HTTP Response
       │
       ▼
    Client
```

### [MODULES] Core Module Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  AUTH MODULE (Security Core)                  │
│  [JWT Generation] [API Key Management] [Token Refresh]       │
│  [Role-Based Access] [Security Filters]                      │
└──────────┬───────────────────────────────────────────────────┘
           │
       ┌───┴───┬────────────────────┬──────────────────┐
       │       │                    │                  │
    [USER]  [WALLET]          [TRANSFER]         [WALLET-TXN]
    Module  Module             Module             Module
       │       │                    │                  │
       └───┬───┴───┬────────────────┼──────────────┬──┘
           │       │                │              │
       [LEDGER]  [RISK]        [RECONCILIATION]  [WEBHOOK]
       Module    Module          Module          Module
           │       │                │              │
           └───┬───┴────────────────┼──────────────┘
               │                    │
          [NOTIFICATIONS]     [AUDIT LOGS]
          Module              Module
               │                │
               └────────────────┴─────────────────────┐
                                                      │
              [COMMON/SHARED UTILITIES & CONFIG]
              (AsyncConfig, SecurityConfig, etc.)
```

### [PATTERNS] Design Patterns Implemented

1. **Service Layer Pattern**
   - Encapsulates business logic away from controllers
   - Enables service reusability and testing
   - Single responsibility per service

2. **Repository Pattern (Data Access Object)**
   - Abstracts data persistence details
   - Enables database independence
   - Supports custom query implementation

3. **DTO Pattern (Data Transfer Object)**
   - Decouples internal models from API contracts
   - Enables API versioning
   - Reduces over-fetching of data

4. **Mapper Pattern**
   - Centralizes entity-to-DTO conversions
   - Enables consistent transformations
   - Supports complex mapping logic

5. **Factory Pattern**
   - Creates risk rules dynamically
   - Abstracts object instantiation
   - Enables flexible rule management

6. **Observer Pattern (Event-Driven)**
   - Decouples event producers from consumers
   - Enables webhook processing
   - Supports async notifications

7. **Async Pattern (CompletableFuture)**
   - Non-blocking operations
   - Improved throughput for I/O operations
   - Concurrent processing with thread pools

8. **Strategy Pattern**
   - Pluggable notification providers (SMS, Email)
   - Runtime strategy selection
   - Easy provider switching

9. **Singleton Pattern**
   - Configuration beans (AsyncConfig, SecurityConfig)
   - Managed by Spring IoC container
   - Single instance across application

10. **Decorator Pattern**
    - Security filters wrap HTTP requests
    - Adds functionality without modifying originals
    - Clean cross-cutting concerns

## Concurrency & Performance

### Overview
Sutura implements sophisticated concurrency patterns for high-throughput payment processing. See [CONCURRENCY_GUIDE.md](sutura/CONCURRENCY_GUIDE.md) for detailed information.

### [ASYNC] Async Executors

#### riskEvaluationExecutor
- **Config**: Core=4, Max=8
- **Purpose**: Parallel risk rule evaluation
- **Use Case**: Evaluating 10+ risk rules concurrently

#### reconciliationExecutor
- **Config**: Core=8, Max=16
- **Purpose**: Batch wallet reconciliation
- **Use Case**: Parallel wallet-to-ledger consistency checks

#### webhookExecutor
- **Config**: Core=6, Max=12
- **Purpose**: Webhook processing
- **Use Case**: Parallel webhook validation and processing

#### transferExecutor
- **Config**: Core=10, Max=20
- **Purpose**: Transfer execution
- **Use Case**: Parallel ledger recording and wallet updates

#### taskExecutor (Default)
- **Config**: Core=10, Max=20
- **Purpose**: General async operations
- **Use Case**: Notifications, batch jobs, etc.

### [OPTIMIZATION] Performance Optimizations

1. **Parallel Rule Evaluation**: Risk rules evaluated concurrently instead of sequentially (10+ sequential queries → parallel execution)
2. **Connection Pooling**: HikariCP manages database connections efficiently
3. **Redis Caching**: 10-minute TTL for frequently accessed data reduces database load
4. **Batch Processing**: Bulk operations for reconciliation minimize round-trips
5. **Lazy Loading**: JPA lazy loading prevents unnecessary data fetching
6. **Query Optimization**: Custom repository queries minimize N+1 problem
7. **Rate Limiting**: Protects against abuse and ensures fair resource usage

## Modem Pay Webhook Integration

Sutura integrates with [Modem Pay](https://modempay.com) to handle real-time payment webhook events, enabling automatic transaction status updates.

### Webhook Events

Sutura processes the following Modem Pay webhook events:

| Event | Description | Transaction Status |
|-------|-------------|-------------------|
| `charge.succeeded` | Payment successfully processed | COMPLETED |
| `charge.failed` | Payment failed | FAILED |
| `charge.cancelled` | Payment cancelled | CANCELLED |
| `charge.pending` | Payment pending | PENDING |

### Setup

1. **Configure Modem Pay Credentials** in `.env`:
   ```bash
   MODEMPAY_API_KEY=pk_test_...
   MODEMPAY_PUBLIC_KEY=pub_test_...
   MODEMPAY_WEBHOOK_SECRET=whsec_...
   ```

2. **Register Webhook Endpoint** in Modem Pay Dashboard:
   - URL: `https://yourdomain.com/api/v1/webhooks/modem-pay/charges`
   - Events: charge.succeeded, charge.failed, charge.cancelled, charge.pending

3. **Verify Endpoint Health**:
   ```bash
   curl https://yourdomain.com/api/v1/webhooks/modem-pay/health
   ```

### How It Works

```
Modem Pay → HMAC-SHA256 Signature → Sutura Webhook Endpoint
                                    ↓
                          Verify Signature (Security)
                                    ↓
                          Lookup Transaction by Reference
                                    ↓
                          Update Transaction Status
                                    ↓
                          Return 200 OK to Modem Pay
```

### Usage Example

When creating a payment with Modem Pay, pass your Sutura transaction ID as the `reference`:

```json
{
  "amount": 450.00,
  "currency": "GMD",
  "reference": "txn_abc123",
  "customer_email": "user@example.com"
}
```

When the webhook arrives, Sutura automatically:
1. Verifies the HMAC-SHA256 signature
2. Looks up the transaction by reference
3. Updates the transaction status
4. Confirms success to Modem Pay

### Documentation

- **Quick Reference**: [MODEM_PAY_QUICK_REFERENCE.md](./MODEM_PAY_QUICK_REFERENCE.md)
- **Full Integration Guide**: [MODEM_PAY_WEBHOOK_GUIDE.md](./MODEM_PAY_WEBHOOK_GUIDE.md)

### Webhook Endpoint

```
POST /api/v1/webhooks/modem-pay/charges
Headers:
  - X-ModemPay-Signature: <HMAC-SHA256>
  - Content-Type: application/json
```

### Error Handling

All webhook events are processed with:
- ✅ Signature verification (prevents tampering)
- ✅ Transaction lookup (ensures transaction exists)
- ✅ Idempotent updates (handles retries safely)
- ✅ Comprehensive logging (for debugging)
- ✅ Error responses (clear feedback to Modem Pay)

## Development Guidelines


### [STYLE] Code Style
- Follow Spring Framework conventions
- Use meaningful variable and method names
- Keep methods focused (Single Responsibility)
- Write comprehensive JavaDoc comments
- Use Lombok annotations to reduce boilerplate code
- Implement proper exception handling

### [ENTITY] Creating New Entities

```java
@Entity
@Table(name = "my_entities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MyEntity extends BaseEntity {
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "description", length = 500)
    private String description;
    
    @Enumerated(EnumType.STRING)
    private MyStatus status;
}
```

### [SERVICE] Creating New Services

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class MyService {
    
    private final MyRepository repository;
    private final Executor myExecutor;  // Inject if async needed
    
    public MyEntity create(MyRequest request) {
        log.info("Creating new entity: {}", request.getName());
        MyEntity entity = new MyEntity();
        entity.setName(request.getName());
        return repository.save(entity);
    }
    
    @Async("myExecutor")
    public CompletableFuture<Void> processAsync() {
        log.debug("Starting async processing");
        return CompletableFuture.completedFuture(null);
    }
}
```

### [ENDPOINT] Creating New Endpoints

```java
@RestController
@RequestMapping("/api/my-resource")
@Slf4j
@RequiredArgsConstructor
public class MyController {
    
    private final MyService service;
    
    @PostMapping
    public ResponseEntity<ApiResponse<MyResponse>> create(
            @Valid @RequestBody MyRequest request) {
        MyEntity entity = service.create(request);
        return ResponseEntity.ok(
            ApiResponse.success("Resource created successfully", 
                mapper.toResponse(entity))
        );
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MyResponse>> getById(
            @PathVariable String id) {
        MyEntity entity = service.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Not found"));
        return ResponseEntity.ok(
            ApiResponse.success("Resource retrieved", 
                mapper.toResponse(entity))
        );
    }
}
```

### [TEST] Testing

Create tests in `src/test/java` following the same package structure:

```java
@SpringBootTest
@ActiveProfiles("test")
class MyServiceTest {
    
    @MockBean
    private MyRepository repository;
    
    @InjectMocks
    private MyService service;
    
    @Test
    void testCreate() {
        MyRequest request = new MyRequest("Test");
        MyEntity entity = new MyEntity(null, "Test");
        
        when(repository.save(any(MyEntity.class)))
            .thenReturn(entity);
        
        MyEntity result = service.create(request);
        
        assertNotNull(result);
        assertEquals("Test", result.getName());
        verify(repository).save(any(MyEntity.class));
    }
}
```

## Contributing

### [WORKFLOW] Development Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **Push to Remote**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Describe the changes
   - Reference any related issues
   - Ensure CI/CD checks pass

### [COMMIT] Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Example:
```
feat: add KYC level verification for wallets

- Implement KYC level checking in wallet service
- Add validation rules based on KYC tier
- Update wallet limits accordingly

Closes #123
```

## Troubleshooting

### [ISSUES] Common Issues

#### 1. Database Connection Failed
```
Error: Connection to localhost:5432 refused
```

**Solution**:
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Or start it
docker-compose up -d
```

#### 2. Redis Connection Timeout
```
Error: Unable to connect to Redis localhost:6379
```

**Solution**:
```bash
# Start Redis
docker run -d -p 6379:6379 redis:7

# Or via compose
docker-compose up -d
```

#### 3. JWT Token Invalid
```
Error: JWT signature does not match
```

**Solution**: Verify JWT_SECRET is consistent between token generation and validation.

#### 4. Maven Build Failure
```
[ERROR] COMPILATION ERROR
```

**Solution**:
```bash
# Clean and rebuild
./mvnw clean install -X

# Or use JDK 17+ explicitly
export JAVA_HOME=/path/to/jdk17
./mvnw clean install
```

#### 5. Port Already in Use
```
Error: Address already in use: 0.0.0.0:5000
```

**Solution**:
```bash
# Change port in application.yaml
server:
  port: 5001

# Or kill existing process (macOS/Linux)
lsof -i :5000

# Or (Windows)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess
```

### [DEBUG] Debug Mode

Run with debug output:
```bash
./mvnw spring-boot:run -Dspring-boot.run.arguments="--debug"

# Or with custom logging
./mvnw spring-boot:run -Dlogging.level.com.mamadou.sutura=TRACE
```

### [RESET] Database Schema Reset

```bash
# Delete PostgreSQL container and volume
docker-compose down -v

# Recreate containers
docker-compose up -d

# Application will auto-create schema on startup
```

## Performance Monitoring

### [METRICS] View Metrics

```bash
# All available metrics
curl http://localhost:5000/actuator/metrics

# Specific metric
curl http://localhost:5000/actuator/metrics/http.server.requests

# Prometheus format
curl http://localhost:5000/actuator/prometheus
```

### [HEALTH] Health Checks

```bash
# Detailed health (requires authentication)
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/actuator/health

# Basic health
curl http://localhost:5000/actuator/health/readiness
```

### [LOGS] Application Logs

```bash
# View logs
tail -f logs/sutura.log

# Search for errors
grep "ERROR" logs/sutura.log

# Follow logs in real-time
tail -f logs/sutura.log | grep WARN
```

## Security Considerations

### [CREDENTIALS] Credentials Management
- Never commit credentials to repository
- Use environment variables for secrets
- Rotate JWT secrets regularly
- Store sensitive data in secure vaults

### [DATABASE] Database Security
- Use strong passwords for database
- Enable SSL/TLS for database connections
- Implement row-level security if needed
- Regular backups and disaster recovery plans

### [SHIELD] API Security
- Use HTTPS in production
- Implement rate limiting per IP/user
- Validate all inputs (sanitization)
- Use CORS appropriately
- Implement request signing for sensitive operations

### [AUTH] Authentication Best Practices
- Enforce strong password policies
- Implement MFA for admin accounts
- Use short-lived access tokens (15 min)
- Implement secure token refresh mechanism
- Log authentication events

### [PRODUCTION] Production Deployment
- Use secrets management (Vault, AWS Secrets Manager)
- Enable request/response encryption
- Implement comprehensive logging
- Set up monitoring and alerting
- Regular security audits and penetration testing

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support & Contact

For issues, questions, or contributions:
- **Repository**: https://github.com/Mamadou8bah/sutura-server
- **Issues**: https://github.com/Mamadou8bah/sutura-server/issues
- **Email**: support@sutura.local

## Changelog

### Version 0.0.1 (Current)
- Initial project setup
- Core authentication system
- Wallet management system
- Transfer functionality
- Risk assessment engine
- Ledger system
- Webhook integration
- Notification system
- Admin dashboard
- Monitoring and metrics

---

**Last Updated**: May 28, 2026
**Maintainer**: Mamadou Bah
**Status**: Active Development
