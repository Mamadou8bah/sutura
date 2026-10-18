-- Manual PostgreSQL migration; apply after 001 before ddl-auto=validate startup.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sentinel_case_id VARCHAR(64);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sentinel_transaction_id VARCHAR(64);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sentinel_recommendation VARCHAR(16);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_sentinel_case ON transactions(sentinel_case_id);

CREATE TABLE IF NOT EXISTS ledger_traces (
    id VARCHAR(80) PRIMARY KEY,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
-- Existing traces remain guarded by the posting lookup; reserve them as well.
INSERT INTO ledger_traces (id, currency, created_at)
SELECT trace_id, MIN(currency), CURRENT_TIMESTAMP FROM ledger_postings
GROUP BY trace_id ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS sentinel_webhook_receipts (
    id VARCHAR(64) PRIMARY KEY,
    payload_hash VARCHAR(64) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL
);
