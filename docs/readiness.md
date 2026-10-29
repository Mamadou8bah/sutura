## Presentation deployment update — 24 October 2026

Local validation for this pass: 186 Sutura backend tests passed against PostgreSQL with four opt-in skips; 37 CV-service and 24 transaction-service tests passed. All three Expo exports, Next.js build and Sentinel desk build passed. Sentinel fresh-schema migration, deployment guards and bootstrap checks passed. Docker image builds and actual hosted delivery are still unverified.

Use [the free Render runbook](deploy-free-presentation.md) and `render-free.yaml`
for the presentation configuration. The existing `render.yaml` retains the paid
production-oriented API/database setup. Both repositories have separate free
Blueprints; only Sutura creates the shared free database/cache. Sentinel uses a
separate database schema and has secure first-tenant bootstrap, restricted CORS,
no development accounts, and a fresh Flyway migration. Sutura now supports HTTPS
email delivery and first-admin startup provisioning for free Render's limits.

All three Expo web exports and both website builds pass locally. The prepared
PaySim-v3 HF transaction export loads its model successfully. Identity training
preflight reports all four datasets missing. Live hosting, provider credentials,
actual OTP/payment callbacks and identity training remain outstanding; these
local checks are not a completed deployment. See Sentinel's
`docs/deploy-huggingface.md` for Space exports and dataset prerequisites.

# Readiness checklist

Updated 18 October 2026. Virtual cards are excluded by the user's explicit scope
decision; the Sentinel LaTeX proposal has been updated accordingly.

## Implemented and checked

- Hosted KYC start/status/refresh, web/mobile entry points, signed callback refresh.
- Verified-only elevated wallet tiers/caps; synthetic evidence cannot verify.
- Durable transfer allow/review/block, signed matched review resolution and retries.
- Unique ledger trace reservation, balanced positive postings and synchronous transfer execution.
- PostgreSQL transfer tests: concurrent spending, idempotent replay, changed-key rejection,
  review approval, frozen-wallet approval failure, rollback after posting and safe retry.
- Sutura startup fixes: distinct idempotency beans, one executor configuration,
  security dependency cycle removal, cache auto-configuration, reserved column and index names.
- Deposit/withdrawal lifecycle timestamps now call their inherited audit callbacks.
- Agent cash completion locks the operation and wallet, checks settlement-time
  scoring, updates the pending product transaction and records its ledger trace.
- Deposit/withdrawal request keys are scoped to actor and operation; fingerprints
  bind the payment details, and mismatched currencies are refused.
- Provider deposits credit the ledger and complete the original pending transaction atomically.
- Payout funds are reserved before contacting the provider; success settles the hold,
  failure releases it once, and unknown outcomes retain the hold for reconciliation.
- Provider callbacks authenticate raw JSON with HMAC-SHA512, validate stored payment
  details, accept the documented payload/transfer events, and reject mismatched replays.
- Provider HTTP requests use payment intents/transfers with stable upstream keys,
  bounded timeouts and internal references in metadata. Sandbox acceptance remains required.
- Customer web payouts select Wave/Afrimoney and collect a phone number; hosted
  checkout opens on web/mobile, and agent requests stay in the internal cash flow.
- Single-use merchant checkout at `/pay/<reference>` runs through the durable
  transfer/review path; merchant ownership, currency and expiry are enforced.
- Reversals lock the original payment, scope retry keys to the actor and enforce
  ownership/admin access before returning a receipt. Concurrent refund tests pass.
- Transfers, reversals and payout holds/releases now record wallet-history rows
  in the ledger transaction; reconciliation reads and writes stay in one transaction.
- Money inputs are bounded and reject excess precision before database rounding.
- Runnable Python transaction scoring and image validation/challenge services.
- A trained synthetic amount/time baseline with real SHAP explanations, a held-out
  evaluation report and a caller-supplied PaySim CSV training path.
- Sentinel integration checks with PostgreSQL and actual Python HTTP endpoints.

## App completion pass — 11 October

- Customer, merchant and agent use bundled Inter and persisted light/dark/system themes.
- Read-only dashboard data refreshes every 30 seconds while visible and on return/focus.
- Merchant collections, payment QR, wallets, activity, support and account navigation are implemented.
- Merchant onboarding has validated phone, OTP, business, owner and account stages, compact option sheets and password visibility controls.
- Both customer and merchant have sample identity walkthroughs; these do not grant verification.
- Agent queue refresh checks scanned references, disables settlement for review/terminal states and exposes completed receipt sharing. Live queue references are stored per signed-in account and revalidated on reload; demo queues are not persisted.
- Full Sutura backend suite: 117 passed. Shared/customer UI tests: 25 passed; merchant regression: 1 passed. Sentinel transaction service: 22 passed; identity service: 24 passed.
- Browser checks cover merchant onboarding validation, sample verification, agent status refresh/completion/receipt controls. Mocked service checks do not establish live cross-product readiness.

## Admin workflow alignment

The web admin now includes customer and agent directories, merchant onboarding review, stored identity results, cash-in/deposit and cash-out/payout tracking, and merchant collection tracking. Live merchant approval requires VERIFIED identity, activates only pending merchant accounts and writes an audit entry. New list endpoints are admin-only and paginated. See [admin-workflows.md](admin-workflows.md) for implemented controls and limits.

## Still required before claiming complete readiness

1. **Identity training and evaluation.** Training, manifest validation, four
   PyTorch baseline networks, artifact loading and inference are implemented.
   See `sentinel/services/cv-ml/README.md`. No evaluated identity weights are
   supplied. Separate labelled identity/attack data is still needed; PaySim
   cannot train face, OCR, tampering or anti-spoof models. Verification stays
   unavailable until all four artifacts meet independent holdout gates.
2. **Proposal scope boundary.** Standalone cheque, invoice and signature verification
   are explicitly excluded by the current proposal. They are not Sutura completion
   blockers. Sentinel identity-model acceptance remains a separate dependency.
3. **Payment model acceptance.** Versions 1, 2 and 3 are trained locally.
   Version 3's optional pre-debit balance model detected 1,645/1,646 fraud cases
   with one false positive on the previously used PaySim window (99.94% recall
   and precision). Missing-balance stress recall is only 16.52%; legacy amount
   rules combined with the model yield 76.94% FPR on these simulated amounts.
   These are not production-readiness results. Real independent payment data,
   currency-aware policies and review-workload acceptance remain required.
   Sutura supplies its actual ledger balance for debit operations only; Sentinel
   stores the first assessment snapshot and retries reuse the original decision.
   Apply Sentinel migrations 002/003 before updating the Sutura caller. Existing
   inference has not been switched automatically.
4. **Provider acceptance and recovery.** The adapter now follows the documented
   payment-intent, transfer and signed webhook formats. It still needs sandbox
   credentials and an actual checkout/payout acceptance run. Historical payouts
   without a hold, provider reversals and unresolved timeouts require explicit
   reconciliation; never automatically refund an unknown outcome.
5. **Settlement review acceptance.** Cash and provider requests now persist
   review/block decisions. Matched deposit approval credits once; payout
   approval waits for the recovery worker to reserve funds before dispatch.
   Cash approval still requires an agent action within 15 minutes. Received
   provider deposits rejected by review remain uncredited and need provider
   refund/reconciliation; automatic provider reversals are not implemented.
6. **Live cross-product demonstration.** Registration, role restrictions, merchant
   collections, reversals/reconciliation, native camera permissions and failure
   recovery still need complete scenario coverage. Existing client build checks
   do not replace device/browser and two-application acceptance tests.
7. **Render deployment acceptance.** The Blueprint, Docker image setup, Flyway migrations,
   production guards, SMTP delivery adapter and bootstrap command are implemented.
   See [deploy-render.md](deploy-render.md). Configure real provider credentials,
   verify Render readiness and OTP/payment workflows, and rehearse database restore.
   Docker/Redis runtime checks are configured in CI; they cannot run in this shell.

## Database upgrade

New Render databases use the packaged Flyway V1-V16 migrations automatically.
Existing schemas require a backup, staging rehearsal and explicit Flyway adoption;
see [the Render runbook](deploy-render.md). The historical scripts
`server/sutura/db/migrations/001` through `009` remain upgrade references. Reconcile historical duplicate non-null payment keys
before adding the new unique indexes. New scoped keys are different from old
global keys; drain old in-flight requests before switching versions. Do not
reissue an old provider request under a new key without reconciliation.

Sentinel has a separate outbox migration in
`sentinel/backend/db/migrations/001_signed_webhook_outbox.sql` and
`sentinel/backend/db/migrations/002_transaction_type.sql` and
`sentinel/backend/db/migrations/003_transaction_balance_context.sql` from the workspace
root. Local development can use Hibernate schema updates; production uses Flyway and
Hibernate validation only.

## Provider references

The adapter contract was checked against ModemPay's official documentation on
7 October 2026: [webhooks](https://docs.modempay.com/documentation/core/webhooks),
[payment intents](https://docs.modempay.com/documentation/payment-intents/create),
and [mobile payouts](https://docs.modempay.com/documentation/payouts/mobile-money).
Use `x-modem-signature` (or the explicitly configured signature header).
Callback metadata must preserve `sutura_reference`; unknown references never
create a payment. Local signed fixture tests are not a live provider acceptance run.

## Local verification

See [validation-2026-10-10.md](validation-2026-10-10.md) for the latest commands,
results and remaining acceptance work. These changes are local and uncommitted.

### Admin account actions

Agent provisioning and customer/agent suspension/restoration now have live admin endpoints and demo UI actions. Provisioning validates international phone/email and password length, hashes the password, fixes the AGENT role and records an audit reason. Suspension revokes refresh sessions; access-token authentication and refresh reject suspended, banned, disabled or locked accounts. Restoration cannot activate pending merchant applications. The existing backend regression suite passed (122 tests), followed by 11 focused account/access/admin tests; web TypeScript and browser demo create/suspend/restore checks passed. Merchant resubmission and credential recovery are implemented in the completion pass below.

Admin navigation now uses separate `/dashboard/{section}` routes with a desktop sidebar. Account/operation details use `/dashboard/{section}/{id}`, and agent creation uses `/dashboard/agents/new`. Wallet freeze/unfreeze, payment reversal/search/lookups and webhook reprocessing/replay each have a dedicated task page. Record pages support direct loading and reload via an admin-only lookup endpoint, and back navigation returns to the list. Merchant details also expose separate account access state and suspension/restoration, without changing application approval status. Pending applications cannot be activated through the account control. Browser checks covered routed agent creation, suspension/restoration, back navigation, direct record loading/reload and mobile overflow.

Validation for the routed admin screens: web TypeScript passed; 13 focused backend tests passed, including role-restricted record lookup and management-only account details. Browser checks passed for merchant suspension preserving application approval, pending-merchant control restrictions, missing records, and the routed create/detail/task flows. Merchant resubmission is completed in the later implementation pass; external-provider acceptance remains separate.

## Render backend deployment pass - 18 October

- Added a Render Blueprint for the API, PostgreSQL and private Key Value, validated against the official Render schema.
- Added packaged Flyway migrations, tested on fresh PostgreSQL and explicit adoption of an existing schema without losing a stored receipt.
- Production checks reject noop OTP delivery, missing/weak credentials, unsafe origins, disabled migrations and schema auto-updates. Resend HTTPS email and bounded Jokoor SMS delivery are wired.
- Added CORS and JSON authentication failures, restricted disabled/suspended API-key owners, fingerprinted API-key rate-limit keys and made Redis counters atomic with production fail-closed behavior.
- Added a real Redis Actuator contributor, Render readiness checks, graceful container shutdown and a one-time first-admin command with required email 2FA.
- Fixed audit/risk/reconciliation timestamp callbacks and preservation of failed audit status after a packaged production bootstrap exposed persistence failures.
- See the Render runbook for external go-live gates and operational recovery. This pass does not assert live provider acceptance or a completed Render deployment.

Deployment validation: PostgreSQL regression passed 148 tests; the additional HTTP readiness/security check passed. Final test reports contain 149 passes and two opt-in skips. The packaged prod/render bootstrap and duplicate-admin guard were exercised against an isolated PostgreSQL database. Render Blueprint schema validation passed. Docker and real Redis concurrency still require CI execution.


## Production hardening pass - 18 October

- Production requires second-factor verification; all four clients handle challenges before persisting sessions. Customer signup remains unverified until its SMS challenge succeeds.
- Refresh tokens rotate atomically, use full-token SHA-256 fingerprints and reject reuse. Account token versions invalidate access tokens after logout-all, suspension, lockout and recovery.
- Login and merchant OTP failures persist, are bounded and use database locks. OTP delivery and recovery requests have distributed per-account/contact limits.
- Customer, agent and merchant password recovery uses a verified phone, single-use expiring codes and session revocation. Staff recovery is a separate audited infrastructure command.
- Admin-only webhook replay and reconciliation resolution require reasons and record the actual actor. Restricted accounts cannot authenticate integration keys; public customer signup no longer creates developer accounts.
- Transactional operational alerts persist uncertain payouts, critical risk and reconciliation incidents, retry SMTP delivery and expose failed alerts with audited admin retries.
- PostgreSQL migration and regression run: 168 passed, two opt-in skips; follow-up account-control checks passed (169 passes across the current reports). All four TypeScript checks and 26 customer/merchant tests passed. Mocked browser checks confirmed admin 2FA and replay payloads.
- [Production readiness and remaining external checks](production-readiness.md). Real provider acceptance and Render deployment remain outstanding.

Packaged prod/render first-admin and staff-recovery commands passed on isolated PostgreSQL with V15; operator audit and queued recovery alert were verified. The updated Render Blueprint passed official schema validation.

The production web build passed with its required HTTPS API URL configured. Backend packaging and all four TypeScript checks passed.

Proposal-by-proposal evidence and remaining differences: [Sutura proposal audit](proposal-audit.md). This supersedes older completion notes where they conflict.


## Proposal completion review - 18 October

The proposal audit found and corrected missing transfer counterparty context, pre-approval merchant collections, developer collection permissions, non-persistent developer key revocation, a generated-key response-field mismatch and unsupported reconciliation requests reporting success. Execution rollback now preserves a FAILED product/idempotency result after rolling back all financial writes. Clean/broken-history reconciliation is exercised directly.

The proposal verification script passed on PostgreSQL: 177 passed, two optional skips, zero failures/errors. Web TypeScript and production build passed; mocked browser checks verified generated key display and persistent revoke requests. See [proposal audit](proposal-audit.md) and [defense guide](sutura-demo.md) for exact scope, evidence and remaining acceptance work. This supersedes the old claim that all failure-path product records roll back without a durable outcome.

Final role/error-response checks passed seven tests and backend packaging passed. Current reports contain 178 passes and two optional skips; the full PostgreSQL run preceded the added malformed-JSON test.


## Sutura implementation completion

Automatic KYC onboarding now follows verified contact/merchant registration through a durable retry queue (V16). Customer, merchant and developer verification screens can create/reuse the session automatically; pending results refresh while visible. Developer account owners can complete identity verification for integration payouts. Merchant applications refresh server-side decisions, expose correction/resubmission, invalidate changed owner identity and provision one ledger-linked GMD wallet on approval.

The PostgreSQL implementation suite passed 184 tests with no failures/errors and two optional skips. Proposal-scope Sutura application implementation is complete based on the traced workflows; model training/acceptance, credentials, live provider/deployment checks and academic reporting remain separate. See [the current proposal audit](proposal-audit.md).

Completion validation: all four TypeScript checks, backend packaging, the production web build, merchant Expo web export and 26 customer/merchant regression tests passed. Chromium checks against the production web build and exported merchant app confirmed review reasons, correction submission, approval status persistence and transition to active navigation. A developer verification check confirmed automatic hosted-session creation. External API responses were mocked for those browser checks; native hardware and live providers remain acceptance work.
