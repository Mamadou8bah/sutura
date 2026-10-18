# Sutura proposal audit

Reviewed 18 October 2026 against `sentinel/docs/proposal/fyp-proposal.tex` in the neighboring Sentinel repository. This audit changes Sutura only. The proposal remains the source of scope; historic notes and demo screens are not evidence of live acceptance.

## Requirement traceability

| ID | Proposal commitment | Sutura implementation | Verification evidence / boundary |
| --- | --- | --- | --- |
| S01 | Wallet creates a linked liability account; balance comes from postings | WalletService, LedgerAccountService, LedgerBalanceComputationService | Wallet/transfer integration fixtures read ledger-derived balances |
| S02 | Debits equal credits; trace is unique; currency matches; inactive accounts reject postings | LedgerPostingService and LedgerTrace reservation | LedgerPostingValidationTest, LedgerReservationTest; concurrent/retry scenarios |
| S03 | Insufficient funds and wallet limits reject a reduction | TransferValidationService, WalletLimitService | TransferLedgerIntegrationTest concurrent spending, limits and currency tests |
| S04 | Transfers create product records and post atomically/idempotently | TransferService, TransferExecutionService, IdempotencyService | Allow, replay, changed request, rollback and concurrent spending tests |
| S05 | Failed posting leaves a failed product without unexplained balance change | TransferFailureRecorder records FAILED after financial rollback | Injected completion failure proves no postings/usage change, failed replay and safe new request; database outage/process termination remains an operational recovery case |
| S06 | Deposits/withdrawals settle only after confirmed provider or agent action | DepositService, WithdrawalService, provider settlement and agent services | Signed callback, duplicate settlement, holds/releases, mismatched metadata and unknown outcome tests |
| S07 | Merchant phone/OTP, business, owner and acceptance stages | MerchantRegistrationService and merchant client registration screens | MerchantOtpSecurityTest; admin approval requires VERIFIED identity. Pending merchants cannot create links or receive transfers; corrections can be resubmitted and owner changes restart identity verification |
| S08 | Active merchant collections wallet and payment links | PaymentLinkService; merchant collections/QR and customer scan/pay | Collection pays once, review, expiry, foreign wallet and competing payer tests; approval provisions a ledger-linked GMD collections wallet |
| S09 | Agent/admin look up and complete cash references | AgentController, AgentOperationService and agent app | Cash deposit/withdrawal, role denial, review approval window and repeated completion tests |
| S10 | Admin freeze/unfreeze, reversal, reconciliation and audit | Admin services/controllers; routed admin workspace | Account/admin tests, reversal concurrency and reconciliation resolution tests |
| S11 | Reconciliation reports no mismatch for clean history and stores broken-history mismatch | WalletReconciliationService compares ledger against wallet history | ProposalReconciliationTest uses real persistence/balances and a fixture-scoped batch; no balance correction occurs |
| S12 | Customer/merchant/agent/admin/developer authorization, JWT and integration API keys | Spring Security, refresh rotation, token versions, APIKeyService | HTTP role checks, AccountAccessTest, SessionSecurityIntegrationTest, ApiKeyManagementTest. Key revoke now persists; active developer integrations can create own-wallet collections |
| S13 | Onboarding starts hosted Sentinel KYC and stores authoritative result | KycService, SentinelKycClient and client verification screens | AutomaticKycOnboardingTest, KycServiceTest, SentinelKycClientTest, WalletPrivilegeTest. Verified-contact onboarding queues a hosted session automatically; creation retries durably during outages |
| S14 | Score before settlement with amount/time/channel/counterparty and explanation | FraudDetectionService/Client, transfer/payment compliance | Recipient customer ID now accompanies persisted transfers; debit balance snapshot and client validation tests |
| S15 | ALLOW posts; REVIEW holds; BLOCK and timeout do not post | TransferComplianceService, PaymentComplianceService | Transfer and settlement tests exercise allow/review/block/outage with stored decision references |
| S16 | Signed, matched case/KYC callbacks apply once | SentinelWebhookService and provider signature checks | SentinelCallbackTest and transfer integration tests cover replay, mismatches, review approval/rejection and wallet rechecks |
| S17 | Role-specific mobile/web clients call the core API | Customer, merchant, agent Expo clients and web admin/developer/customer workspaces | TypeScript/build and prior browser checks; native camera and full live-device acceptance still outstanding |
| S18 | Setup notes, integration note, tests, evaluation and oral-defense demonstration | README, deployment/integration notes, this audit, proposal acceptance script and defense guide | Automated local Sutura evidence exists; measured Sentinel KYC/model evaluation, recorded live cross-service demonstration and final academic report remain separate deliverables |

## Fixes made during this review

- Send the persisted transfer recipient identity to Sentinel instead of omitting the proposal's counterparty context.
- Require active account owners for new/reviewed transfers; pending merchants cannot collect before approval and suspended recipients cannot receive a new transfer.
- Permit active developer integrations to issue collections only for their own wallet, matching the proposal's integration actor.
- Persist API-key revocation by owned public ID; show the generated secret using the actual backend response field; load real account payment history in the developer client.
- Replace the developer's nonfunctional outbound-webhook settings form with the supported status-polling contract. Inbound provider/Sentinel callbacks remain supported; merchant outbound notifications are not promised by this proposal.
- Reject unsupported reconciliation types and ignored wallet filters rather than returning an empty successful report.
- Exercise the proposal's clean/broken reconciliation scenario and persist failed product outcomes after execution rollback.
- Update stale migration/integration notes. Cheque, invoice and signature scoring are excluded by the proposal and are not Sutura blockers. Virtual cards remain excluded by the user's scope decision.

## Implementation status and external acceptance

The Sutura application features in the proposal have implementations and automated coverage. Automatic onboarding, durable retry, merchant decision refresh, correction/resubmission and approval wallet provisioning close the previously recorded implementation gaps. Developer integration owners can complete hosted KYC for their own integration account; staff admin/agent accounts remain outside that identity workflow.

The following are validation/delivery work, not missing Sutura application features:

1. Train/evaluate and configure Sentinel's independent identity/fraud artifacts. Weak or unavailable models must not grant verified identity.
2. Configure SMS, SMTP, ModemPay and Sentinel credentials and perform a live cross-service/provider acceptance run.
3. Deploy on Render, run the configured Docker/Redis CI checks, confirm health/callback reachability and rehearse restore.
4. Record the end-to-end demonstration and finish the academic evaluation/report using actual results.

Delegated third-party merchant integrations, merchant-managed outbound webhook delivery, virtual cards and cheque/invoice/signature scoring are outside this proposal's implemented Sutura scope. Merchant account recovery and audited staff credential recovery are implemented.

See [the defense guide](sutura-demo.md), [production readiness](production-readiness.md) and [the integration contract](sentinel-integration.md).


## Validation completed

- `server/deployment/verify-proposal.ps1 -DatabaseUrl jdbc:postgresql://127.0.0.1:15432/sutura_production_hardening_deployment_test`: 179 tests run, 177 passed, zero failures/errors, two opt-in checks skipped (schema export and real Redis). PostgreSQL migrations remained at V15 and Hibernate schema validation passed.
- Web `npx --no-install tsc --noEmit` and production `npm run build` passed with the required HTTPS API base URL supplied.
- A Chromium check against the production build and mocked API responses confirmed one-time key display, public-ID revocation reaching the server and the supported integration-status instructions. This is client contract evidence, not a real provider run.
- Sentinel's repository was inspected read-only and remains unchanged.

Final targeted HTTP checks passed seven tests, including rejection of non-admin reversal requests and generic 400 handling for malformed JSON. Backend packaging passed. Across the current reports, 178 tests pass and two optional checks are skipped; the full PostgreSQL run above preceded the additional malformed-JSON test.


## Implementation completion pass

The final implementation regression run passed 184 tests with zero failures/errors and two opt-in skips on PostgreSQL. Migration V16 adds the durable automatic KYC onboarding queue. Contact verification enqueues customer/developer onboarding; merchant submission enqueues owner verification. Session creation retries with bounded backoff and an operations alert after repeated failures. Queued work survives restarts and never grants verification by itself.

Merchant apps read the authenticated application endpoint for approval status and review reasons. Rejected/more-information applications can be corrected and resubmitted while remaining pending; owner identity changes clear the prior local KYC grant and queue a new session. Approval provisions one GMD collections wallet and its ledger account atomically. Existing wallets are reused without changing frozen status.

Completion validation: all four TypeScript checks, backend packaging, the production web build, merchant Expo web export and 26 customer/merchant regression tests passed. Chromium checks against the production web build and exported merchant app confirmed review reasons, correction submission, approval status persistence and transition to active navigation. A developer verification check confirmed automatic hosted-session creation. External API responses were mocked for those browser checks; native hardware and live providers remain acceptance work.
