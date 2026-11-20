# Read performance — 20 November 2026

Balance computation now obtains net credits in one aggregate SQL statement,
instead of separate debit and credit sums. Debit-normal accounts negate that
result. No balance cache is introduced; financial decisions still read the ledger.
Tests cover all five account types, empty balances, four-decimal precision and
the one-statement query budget. The transfer integration suite also passes.

Agent history prefetches the wallet and customer needed for each response in the
bounded top-100 queries, avoiding per-row lazy relationship reads. The customer
app starts transaction history alongside wallet/balance loading, removing an
unnecessary dependency between independent reads.

Production Hikari defaults are five maximum connections and one idle connection
for small instances. Override `SUTURA_DB_POOL_SIZE` and `SUTURA_DB_MIN_IDLE` for
larger deployments. Existing connection wait limits and all financial write,
authorization, risk and idempotency checks remain in force.

Live probes from the development machine timed out: login at approximately
100 seconds and readiness at 30 seconds. Those probes do not establish a warm
API latency baseline or identify the remote failure. Render service status and
logs need checking before claiming a live response-time improvement. Deploy the
backend and app changes, then compare authenticated reads on a running service.

A direct database probe from the development machine connected in about 1.8
seconds; three warm `SELECT 1` round trips measured 148–227 ms. These are
development-machine network timings, not Render-to-database timings. They do
not explain the live HTTP timeout by themselves.
