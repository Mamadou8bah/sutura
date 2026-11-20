# Customer-authorised agent cash-out

Only the wallet owner can create a withdrawal. Agents cannot create one by
phone, customer ID or wallet ID. This is enforced in `WithdrawalService`, not
only in the app. Cash-in by phone remains available.

The owner requests a QR using authenticated POST
`/api/v1/withdrawals/reference/{reference}/qr`. A random 256-bit capability is
valid for 30 seconds; minting a new one invalidates the old one. Mobile and web
cash-out displays refresh automatically, hide expired codes and pause requests
when not visible. Static deposit-wallet QR codes cannot authorise cash-out.

An agent scans using POST `/api/v1/agent/operations/{reference}/scan` with
`{"token":"<QR capability>"}`. The server locks the withdrawal, checks the token
hash and expiry, and consumes the token once. It returns the trusted operation
and a separate 90-second approval bound to that agent. While an approval is
active, the customer display reports that an agent is reviewing the operation.

POST `/api/v1/agent/operations/{reference}/complete` requires that approval in
the same token field for withdrawals. Missing, expired, foreign-agent or QR
tokens are rejected. A repeated completion with the original approval can
return the already-completed result without posting money again. Compliance
review, wallet restrictions, balance checks and ledger idempotency still apply.
Approval tokens stay only in agent-app memory; reopening a pending operation
after restarting the app requires another scan. No raw capability is stored in
the database. The migration adds hashes, expiry timestamps and the claiming
agent ID to withdrawals.

Deploy the backend with Flyway V17 before publishing updated clients. Old
reference-only cash-out clients intentionally cannot complete withdrawals.
Browser tests cannot prove physical camera scanning. Possession of a live QR
authorises its scan; rotating codes reduce the screenshot reuse window but
cannot prevent someone sharing a still-valid code.

APK distribution: the mobile build workflow validates APK ZIP contents and
publishes `.apk` files and SHA-256 checksums directly to GitHub Releases after
all three builds succeed. Download the app-specific `.apk` under release Assets;
GitHub Actions artifacts remain ZIP downloads for compatibility.
