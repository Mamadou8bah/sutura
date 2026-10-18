ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS reservation_trace_id VARCHAR(80);
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS settlement_trace_id VARCHAR(80);
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS release_trace_id VARCHAR(80);
-- Old in-flight external payouts have no reservation. Reconcile before enabling
-- confirmation processing; do not manufacture a hold after a provider already paid.
