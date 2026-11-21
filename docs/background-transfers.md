# Background customer transfers

After confirmation, the customer app saves a unique request reference in its
encrypted device cache, adds a Processing entry, and returns Home. It dispatches
one request to `POST /api/v1/transfers/queued` using that reference as the
idempotency key. It never resubmits automatically after a timeout or app restart.

The endpoint validates ownership, recipient, balance and limits, and commits the
pending transaction, idempotency record and `transfer_jobs` row together. Its
HTTP 202 response confirms acceptance, not payment completion. The database queue
survives process restarts. Older clients retain the synchronous transfers endpoint.

A dedicated scheduled worker checks the queue every second. It locks the job,
rechecks the sender and wallets, runs Sentinel scoring, and posts only an ALLOW.
Ledger postings, final transaction status and job completion commit atomically.
Duplicate workers or requests cannot post the same job twice. Processing failures
roll back before a separate transaction records failure; they do not silently
retry failed money writes. REVIEW uses the existing Sentinel case workflow.

The app polls read-only data every five seconds while processing and resumes
reads on foreground/unlock. It reconciles by exact request reference and keeps
unconfirmed submissions visible as Check status. It shows Completed only from a
server response. Unconfirmed requests do not change the displayed wallet balance.
An app closed before the server accepts the request cannot guarantee submission;
on reopening, the app checks Activity and never sends that request again.

Deploy backend migration V18 before releasing the updated customer app. Worker
settings: `sutura.transfers.worker-enabled` (default true),
`sutura.transfers.worker-delay-ms` (default 1000). Render sleep can pause the worker;
queued jobs resume when the backend runs again. Backgrounding improves the flow,
not the time required by external services.
