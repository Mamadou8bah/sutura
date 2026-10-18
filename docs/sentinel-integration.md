# Sutura and Sentinel integration contract

Checked against the proposal and current Sutura source on 18 October 2026. Sentinel remains a separate repository and service. Only Sutura posts money.

## Configuration and ownership

Sutura calls Sentinel's Java API using `SUTURA_SENTINEL_BASE_URL` and the tenant service credential `SUTURA_SENTINEL_API_KEY` in `X-Api-Key`. The key stays server-side. `externalCustomerId` is the authenticated Sutura user ID as a string. Configure `SUTURA_SENTINEL_TENANT_CODE` and the independent `SUTURA_SENTINEL_WEBHOOK_SECRET` for inbound signed callbacks.

## Onboarding

Registration automatically queues hosted identity onboarding after customer/developer contact verification or verified-phone merchant submission. The durable worker creates the Sentinel session and retries outages with backoff; repeated failures queue an operations alert. The clients route new accounts into verification and can immediately call `POST /api/v1/kyc/sessions`, reusing a worker-created session under the same account lock. Sutura stores the session reference and returns its hosted URL. Identity evidence is supplied only on the hosted page. `GET /api/v1/kyc` reads stored status and `POST /api/v1/kyc/refresh` polls the stored session. Signed KYC callbacks also fetch the authoritative status using the service key.

Customer, merchant and developer account owners can use these endpoints. Admin and agent roles cannot. Callers cannot supply another user ID or fabricate a result. Pending sessions are reused until expiry; flagged sessions retain their review history. Stored VERIFIED identity is required for elevated tiers/caps and merchant approval. Weak/invalid evidence and service failures cannot grant verification.

## Scoring

Before transfer execution or cash/provider settlement, Sutura calls `POST /api/integration/transactions/score` with:

- authenticated customer ID and stable external transaction reference;
- amount, currency, timestamp, operation type, channel and location;
- actual ledger balance before debit operations (never the credited recipient's balance);
- the actual recipient customer ID for persisted wallet transfers, including collection payments. External deposit/payout counterparties remain absent when no trusted identity is available.

The response must match customer and transaction references and contain a Sentinel transaction ID, finite score in [0,1], explanation and ALLOW/REVIEW/BLOCK recommendation. Attribution and case references are retained in Sutura's evaluation records. Missing customers, credentials, timeouts and malformed responses fail closed.

| Operation/result | Sutura action |
| --- | --- |
| Transfer ALLOW | Balanced posting and history/limit updates commit atomically; complete once under the trace |
| Transfer REVIEW | Persist PENDING with case references; no posting |
| Transfer BLOCK or scoring outage | Persist FAILED; no posting |
| Cash review approval | Mark APPROVED; an agent must complete within 15 minutes; the callback never exchanges cash |
| Provider deposit review approval | Credit the matched original deposit once after current wallet checks |
| Provider payout review approval | Recovery worker reserves funds before dispatch; approval itself does not send money |
| Case rejection | Fail the pending operation without posting; already received provider funds require reconciliation/refund handling |
| Case escalation | Keep the operation pending |
| Unknown payout outcome | Retain the funds hold until reconciliation establishes the result |

See [settlement review](settlement-reviews.md) for product-specific states. Retries reuse stored decisions and stable references rather than opening a new financial operation.

Posting and completion exceptions roll back ledger, history and limits together. After rollback, a separate transaction records a FAILED product and the request key, so retries return that failure and cannot post. A fresh attempt requires a new request/reference. This recovery write depends on the database being available and the application reaching rollback completion; a database outage or process termination still requires operational investigation. Normal scoring rejection/outage paths persist FAILED in the original transaction.

## Signed callbacks

The receiver is `POST /api/v1/webhooks/sentinel`. Required headers are `X-Sentinel-Event-Id`, `X-Sentinel-Timestamp` and `X-Sentinel-Signature`. The signature is lowercase hexadecimal HMAC-SHA256 over UTF-8 `timestamp + "." + exact raw JSON body`, using the configured signing secret. The timestamp permits 300 seconds of skew. Payload tenant and event IDs must match configuration and headers.

Sutura stores a payload hash with each event receipt. Identical retries are acknowledged; a changed body under an existing event ID is rejected. Case callbacks must match case ID, Sentinel transaction ID, external reference and customer. Approval rechecks balance, wallet/account state, currency and limits. Resolved transfers cannot post again. KYC callbacks fetch authoritative status instead of accepting caller-supplied scores.

## Database deployment

Sutura uses packaged Flyway migrations V1-V16 and `ddl-auto=validate` in production. Existing schemas need explicit adoption and an upgrade rehearsal; see [Render deployment](deploy-render.md). Historical `db/migrations` files are references, not an additional migration runner. Sentinel owns its separate migrations and outbound delivery mechanism.

## Acceptance evidence

`KycServiceTest`, `SentinelKycClientTest`, `WalletPrivilegeTest`, `FraudDetectionClientTest`, `FraudDetectionServiceTest`, `TransferComplianceTest`, `SentinelCallbackTest` and `TransferLedgerIntegrationTest` exercise Sutura's contract and settlement behavior. Stubbed responses establish caller behavior, not measured identity-model accuracy or a live two-service demonstration. See [proposal audit](proposal-audit.md).
