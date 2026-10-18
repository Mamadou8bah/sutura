# Sutura demonstration and acceptance guide

This guide follows the Sutura requirements in the final-year proposal. Use an isolated staging deployment or disposable test data. Local demo mode is useful for UI review but cannot establish ledger, provider or identity acceptance.

## Automated Sutura evidence

From the Sutura repository root in PowerShell:

```powershell
./server/deployment/verify-proposal.ps1
```

The script runs the backend regression suite on its isolated in-memory test database. Its integration tests stub external providers/Sentinel; it never proves real model accuracy or payment-provider delivery. For the PostgreSQL run, use a disposable local database ending in `_deployment_test`, set `TEST_DATABASE_USER`/`TEST_DATABASE_PASSWORD` securely, then supply `-DatabaseUrl jdbc:postgresql://127.0.0.1:5432/NAME_deployment_test`. Real Redis concurrency remains the configured CI check unless `REDIS_TEST_PORT` is also set.

## Oral-defense sequence

1. Register two Sutura customers, verify their phone codes and sign in. Show that an invalid code cannot create an authenticated session.
2. Start hosted verification from Sutura. Complete or fail the session in Sentinel. Return to Sutura and refresh its authoritative result. Show that weak evidence and synthetic walkthroughs do not grant VERIFIED status or higher limits. Do not call a model accepted without evaluated artifacts.
3. Create GMD wallets. Show the linked liability account and initial ledger-derived zero balance.
4. Fund one wallet using an agent cash-in reference. The agent looks up the reference, checks the settlement decision and completes the cash exchange once. Record the product transaction and balanced cash/liability postings.
5. Make an allowed transfer. Record the product reference and its ledger trace. Repeat with the same key: balances and daily usage change once. Change the amount with that key: reject it.
6. Use controlled Sentinel test policies/data to produce REVIEW. Show pending status and no debit. A Sentinel reviewer approves with a note; the signed matched callback posts once after current checks. Demonstrate rejection/escalation and a blocked payment without money movement. Do not fabricate a decision in Sutura's database.
7. Complete staged merchant onboarding and identity review. Show that pending merchants cannot collect, then approve through the admin app. Create a collection QR, scan and pay from a customer account, then show the merchant receipt and exactly one transfer.
8. Create an agent cash-out reference. Show that case approval alone never exchanges cash; the agent must complete the authorized reference within its approval window.
9. Freeze a wallet, attempt a transfer and show rejection. Unfreeze, reverse an eligible transfer once and inspect the compensating trace and audit actor/reason. Repeat the reversal safely.
10. Run reconciliation on known-good history. In the disposable automated fixture, deliberately change one history amount and show a stored mismatch while the ledger balance stays unchanged. Never corrupt deployment data for a presentation.
11. Sign in as a developer, create and copy a server key once, use it only for the integration account's wallets/collections/payouts, and revoke it. The revoked key must stop authenticating; another developer cannot revoke it.
12. Sign in as an agent and try an admin action: receive authorization failure. Show a forged/changed callback is rejected and an identical valid callback is idempotent.
13. Stop or isolate Sentinel in staging. Money movement must fail closed or remain in its defined pending state. Show operational alerts, uncertain-payout holds and the absence of automatic refunds on unknown outcomes.

Record actual references, ledger balances, case IDs, rejection statuses and screenshots in the final report. Include the model versions/evaluation results and identify stubbed versus live checks. The scripted automated suite is Sutura evidence; it is not a completed live cross-service recording.
