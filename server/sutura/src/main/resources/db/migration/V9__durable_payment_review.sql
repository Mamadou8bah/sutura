ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sentinel_customer_id BIGINT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sentinel_external_reference VARCHAR(120);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sentinel_approved_at TIMESTAMP;
-- Enum names are persisted as strings. Review approval does not exchange agent cash.
ALTER TABLE deposits DROP CONSTRAINT IF EXISTS deposits_status_check;
ALTER TABLE deposits ADD CONSTRAINT deposits_status_check CHECK
    (status IN ('PENDING_REVIEW','APPROVED','AWAITING_AGENT','PENDING','COMPLETED','FAILED','CANCELLED'));
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_status_check CHECK
    (status IN ('PENDING_REVIEW','AWAITING_AGENT','PENDING','APPROVED','PROCESSING','COMPLETED','FAILED','REJECTED'));
