# Sutura production readiness

Updated 18 October 2026. Deployment target: Render. Sentinel remains a separate repository and service. Virtual cards are outside the agreed scope.

The code includes deployment configuration and security hardening, but production acceptance is not complete. Local regression checks cannot substitute for credentials, real provider contracts or a deployed restore exercise.

| Area | Implemented evidence | Remaining acceptance |
| --- | --- | --- |
| Persistence | PostgreSQL migrations V1-V16 and Hibernate schema validation; transactional ledger, holds and idempotency regressions | Rehearse any existing database upgrade and restore into isolated staging |
| Access | Mandatory production second factor; one-time refresh rotation; session invalidation; bounded OTP attempts; verified-phone recovery and audited staff recovery | Deliver SMS/email through the configured accounts; test all roles and recovery in staging |
| Operations | Durable email alerts with backoff, failed queue inspection/retry; audited admin replay and reconciliation resolution | Confirm monitored inbox, failed-count monitoring and incident ownership |
| Provider money movement | Signed callbacks, durable requests, payout holds and reconciliation | ModemPay sandbox deposits/payouts, retries, duplicate callbacks and unknown-outcome reconciliation |
| Identity and risk | Separate Sentinel integration, signed callbacks and verification-based privileges | Deploy accepted models/artifacts and measure their behavior before granting live verification |
| Hosting | Render Blueprint, private database/Redis, startup guards, health probes and graceful shutdown | Apply Blueprint, configure secrets/origins, confirm readiness and external callback reachability |
| Build | 169 backend test passes across current reports, 26 customer/merchant test passes, four TypeScript checks and production web build; packaged production commands validated locally | Run configured CI Docker build and real Redis concurrency check; Docker/Redis were unavailable locally |

Use [the Render runbook](deploy-render.md) and the ignored `server/.env` for local Compose configuration. Render Environment settings are independent. Java/Maven require explicitly exported environment variables.

Before enabling real payments, record the deployed commit, migration version, provider acceptance results, callback URLs, monitored alert recipient and restore rehearsal result. Keep the deployment at one API instance until scheduled-job behavior is reviewed for multiple replicas.

Latest proposal review: [Sutura proposal audit](proposal-audit.md). PostgreSQL regression now passes 177 tests with two optional skips; developer UI production-build/browser contract checks passed. Post-rollback FAILED records depend on successful database recovery writes; process termination/database outage still needs operational investigation.

Proposal-scoped Sutura implementation is complete after the onboarding/merchant workflow pass. Current backend reports contain 184 passes and two optional skips, with V16 schema validation and merchant/KYC follow-up checks passing. Web/mobile builds, TypeScript and browser contract checks passed. This implementation status does not replace the external acceptance column above.
