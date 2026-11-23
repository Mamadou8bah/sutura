ALTER TABLE transactions ADD COLUMN sentinel_request_payload TEXT;
ALTER TABLE transfer_jobs ADD COLUMN next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE transfer_jobs ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_transfer_jobs_retry ON transfer_jobs (next_attempt_at, transaction_id) WHERE finished_at IS NULL;
ALTER TABLE webhook_events ADD COLUMN next_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX idx_native_payment_retry ON webhook_events (next_attempt_at, id)
    WHERE provider = 'MODEMPAY_NATIVE' AND status IN ('RECEIVED', 'RETRY');
