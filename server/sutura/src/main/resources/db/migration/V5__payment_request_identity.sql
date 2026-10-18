ALTER TABLE deposits ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);
-- Internal cash operations have no external provider method.
ALTER TABLE withdrawals ALTER COLUMN withdrawal_method DROP NOT NULL;
-- Reconcile historical duplicate non-null keys before applying these constraints.
CREATE UNIQUE INDEX IF NOT EXISTS uq_deposits_idempotency ON deposits(idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_withdrawals_idempotency ON withdrawals(idempotency_key);
