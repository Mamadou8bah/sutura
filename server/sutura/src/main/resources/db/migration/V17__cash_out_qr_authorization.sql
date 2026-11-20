ALTER TABLE withdrawals ADD COLUMN cash_qr_hash VARCHAR(64);
ALTER TABLE withdrawals ADD COLUMN cash_qr_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE withdrawals ADD COLUMN cash_claim_hash VARCHAR(64);
ALTER TABLE withdrawals ADD COLUMN cash_claim_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE withdrawals ADD COLUMN cash_claim_agent_id BIGINT REFERENCES users(id);
