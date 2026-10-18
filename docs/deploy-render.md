# Deploy Sutura on Render

Prepared 18 October 2026. Sutura and Sentinel remain separate services and repositories.

## Deployment configuration

The root `render.yaml` defines a Docker API service, PostgreSQL 17 and a private Key Value instance in Frankfurt. Review the paid instance types and costs before applying it. Render provides HTTPS; the Compose Caddy gateway is only for the alternative VPS setup.

Automatic deployments wait for CI checks to pass. The API uses `prod,render`, Render's `PORT`, database connection fields and the internal Redis URL. Its readiness check includes PostgreSQL and Redis. Logs go to stdout. The Blueprint was checked against the [official Render schema and reference](https://render.com/docs/blueprint-spec).

Private Key Value URLs normally omit authentication. The validator allows this only for an internal `red-*` hostname when Render sets `RENDER=true`. Other Redis URLs require credentials; `rediss://` enables TLS. External database and Key Value access are disabled by the Blueprint. See [Render Key Value networking](https://render.com/docs/key-value).

## Supply configuration

1. Connect the Sutura repository to a new Render Blueprint after pushing the reviewed changes. This work does not create or change resources in your Render account.
2. Supply the separate Sentinel URL, tenant code, API key and matching callback signing secret. Do not use localhost for another Render service.
3. Supply ModemPay sandbox keys and webhook signing secret. Run sandbox acceptance before switching to live credentials.
4. Configure Twilio SMS delivery and an authenticated SMTP provider supporting STARTTLS on port 587. Verify the sender address/domain with the email provider. Set `SUTURA_ALERT_EMAIL` to a monitored operations inbox. Production refuses noop OTP delivery and requires a second factor for every sign-in.
5. Set `SUTURA_CORS_ALLOWED_ORIGINS` to exact HTTPS web origins separated by commas, with no paths or trailing slashes. Native apps do not require CORS entries.

Render prompts for `sync: false` variables on initial creation. Add later secret variables manually in service Environment settings. Keep secrets out of source, logs and chat. The Blueprint generates JWT_SECRET. Independent webhook signing secrets must contain at least 32 characters and match their senders.

For local Compose, copy `server/.env.example` to the ignored `server/.env`. Compose loads that file automatically when run from `server`. Java and Maven do not load `.env` automatically: export the variables into the process environment or use your IDE environment-file support. Render uses its Environment settings; never commit or upload the local file.

## Database migrations

Flyway migrates empty databases automatically before Hibernate validates the schema. Subsequent starts validate checksums. Clean and automatic baselining are disabled; production must use `ddl-auto=validate`.

Existing databases require a backup and staging rehearsal. Never apply the initial schema to a nonempty database. For an existing Sutura schema only, explicitly adopt Flyway version 1 with the Flyway CLI (`baseline -baselineVersion=1`), supplying FLYWAY_URL, FLYWAY_USER and FLYWAY_PASSWORD securely. The next startup runs V2-V15: historical idempotent upgrades, session invalidation, bounded merchant OTP attempts, durable alerts, normalized email uniqueness and password recovery. Review duplicate keys, old payouts without holds and in-flight requests first. Resolve duplicate `lower(email)` values before V14; the migration deliberately refuses ambiguous identities. V11 invalidates existing sessions and legacy refresh tokens, requiring users to sign in again. Do not baseline another application's database.

Packaged files under `src/main/resources/db/migration` are authoritative. The old `db/migrations` files are historical references. Never edit a deployed migration; add a new version. Future migrations must remain compatible with the previous application during rolling replacement. Start with one API instance; scheduled business jobs need a separate replica-safety review before scaling.

## First administrator

There is no public admin signup or default password. In the Render API service shell, supply these environment variables for the one-time command:

- SUTURA_BOOTSTRAP_FIRST_NAME and SUTURA_BOOTSTRAP_LAST_NAME
- SUTURA_BOOTSTRAP_EMAIL and SUTURA_BOOTSTRAP_PHONE (international format)
- SUTURA_BOOTSTRAP_PASSWORD (at least 14 characters and at most 72 UTF-8 bytes)

Enter the password using hidden shell input or your secret manager, avoiding command history. Run:

```sh
/app/docker-entrypoint.sh --bootstrap-admin
```

This uses a random local port, disables scheduled jobs, takes a PostgreSQL transaction lock and creates only the first administrator. It enables email 2FA and records an audit entry. It exits after completion and refuses to run if an administrator already exists. Clear the bootstrap variables afterwards; never store them permanently on the service. Admin login accepts the phone number or email and delivers its second factor to the configured email address.

## Account recovery

Customer, merchant and agent login screens provide password recovery using the account's verified phone number. Requests return a generic acknowledgement, including for unknown accounts. Codes expire after ten minutes, permit five failed attempts and can be used once. Resets require at least 12 characters, invalidate all sessions and other outstanding recovery codes, and preserve suspension or bans. Registration and sign-in second factors expire after five minutes; account lockout lasts 15 minutes.

Admin and developer accounts cannot use public SMS recovery. A trusted infrastructure operator can run this one-shot command in the Render service shell after verifying the requester's identity through the organization's staff recovery process:

```sh
/app/docker-entrypoint.sh --recover-staff
```

Supply `SUTURA_RECOVERY_ACCOUNT_ID`, `SUTURA_RECOVERY_OPERATOR`, `SUTURA_RECOVERY_REASON` and `SUTURA_RECOVERY_PASSWORD` through protected environment variables. The password requires at least 14 characters and at most 72 UTF-8 bytes. Avoid command history and clear these variables afterwards. The command invalidates all sessions, requires email 2FA, retains account restrictions, records the operator/reason and queues an operations alert. It never changes the registered email or phone. Restrict Render shell access to trusted operators.

## Acceptance checks

From the Sutura repository root:

```sh
python server/deployment/smoke.py --api-url https://YOUR-API-HOST --origin https://YOUR-WEB-HOST
```

The script only checks health, authorization and CORS. Also verify these sandbox workflows before accepting real payments:

- Customer registration, merchant SMS OTP and admin email 2FA.
- Role restrictions, suspension, JWT authentication and API-key authentication.
- Transfers and merchant collections, duplicate requests, insufficient funds and risk review.
- Agent cash-in/out and retries; approval alone must never exchange agent cash.
- ModemPay checkout/payout, valid and invalid callback signatures, duplicate callbacks, timeout recovery and ledger reconciliation.
- Sentinel KYC and review callbacks using the correct tenant and signing secret. Unevaluated identity models must not be advertised as live verification.

Configure the public API callback URLs in the provider and Sentinel settings. The signed Sentinel receiver is `/api/v1/webhooks/sentinel`. ModemPay callbacks use the adapter's deposit or payout routes under `/api/v1/webhooks/modempay` and `/api/v1/webhooks/modem-pay`; match the specific product contract rather than configuring a guessed catch-all URL.

## Recovery and operations

Configure Render health monitoring and review logs. Uncertain payout outcomes, critical risk flags and reconciliation failures/mismatches queue alerts in the same database transaction as their source event. SMTP delivery retries with backoff, then marks an alert FAILED after eight attempts. Delivery is at least once; duplicates after an interrupted SMTP acknowledgement are possible and carry the same alert ID.

Authenticated admins can inspect `GET /api/v1/admin/alerts?page=0` and `/counts`. `POST /api/v1/admin/alerts/{id}/retry` accepts `{"reason":"..."}` for FAILED alerts and records the operator in the audit trail. Monitor failed counts as well as the destination inbox. Webhook replay and reconciliation resolution are admin-only and require reasons. An alert never releases uncertain payout funds automatically.

 PostgreSQL is authoritative; Redis loss must never create money or alter ledger history. Authentication limits fail closed during Redis failures.

Confirm backups for the selected database plan and rehearse a restore into a separate staging database. Keep encrypted off-host exports where required and record recovery ownership. See [Render PostgreSQL backups](https://render.com/docs/postgresql-backups). Never test restore against live data.

Roll back application versions only if they are compatible with the migrated schema. Do not run Flyway clean, delete volumes or replay uncertain provider payments during recovery. Unknown payout outcomes retain their holds until reconciliation. Coordinate webhook secret rotation with the sender. Rotating JWT_SECRET invalidates existing JWTs.

## Validation limits

Local validation covers the Blueprint schema, production guards, CORS/authentication boundaries, cryptography, bootstrap logic and PostgreSQL migration/schema validation. CI additionally provisions PostgreSQL/Redis and builds the Docker image. Docker and Redis are unavailable locally, so those runtime checks remain for CI. No Render resources have been deployed here.

Live OTP delivery, ModemPay sandbox acceptance, Sentinel deployment/model acceptance, Render health checks and a restore rehearsal remain external go-live gates.

Earlier deployment validation on 18 October (before the subsequent hardening pass): the PostgreSQL regression run passed 148 tests, followed by five HTTP security/readiness checks. Across the final reports, 149 tests passed and two opt-in checks (schema export and a real Redis concurrency run) were skipped. The packaged production/Render application created exactly one first admin with a 60-character BCrypt hash, required 2FA and a timestamped audit entry; a repeated bootstrap correctly failed. Docker builds and real Redis concurrency remain CI checks, not locally verified outcomes.


## Production hardening validation

The subsequent PostgreSQL run passed 168 tests with two opt-in skips, followed by passing account-control checks (169 passes across the current reports); it exercised migrations through V15, refresh rotation and concurrent reuse, OTP attempt persistence, password recovery, audit integrity and durable alert delivery/retries. All four clients passed TypeScript checks; customer/merchant regression tests passed 26 tests. Browser checks with mocked API responses confirmed admin second-factor session handling and the audited webhook replay request. These checks do not prove provider delivery or live deployment acceptance. See [production readiness](production-readiness.md) for remaining gates.

The final packaged `prod,render` application was exercised against a new isolated PostgreSQL database: V15 applied, the first admin was created, staff recovery advanced its session version, retained 2FA, wrote an operator audit entry and queued an operations alert. External SMS, SMTP, Sentinel and payment endpoints were placeholders and were not called. The updated Render Blueprint also passed the official schema validator.

The production web build passed with its required HTTPS API URL configured. Backend packaging and all four TypeScript checks passed.

V16 adds `kyc_onboarding_jobs` for automatic post-contact-verification onboarding. The worker retries Sentinel outages with backoff and alerts operations after five failures. Merchant submission and owner-identity corrections enqueue/restart the workflow. Keep scheduled jobs enabled on the API instance. New merchant approval provisions its GMD collections wallet in the approval transaction.
