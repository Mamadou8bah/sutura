CREATE TABLE kyc_onboarding_jobs (
 user_id BIGINT PRIMARY KEY REFERENCES users(id),
 status VARCHAR(16) NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMP NOT NULL,
 next_attempt_at TIMESTAMP NOT NULL,
 completed_at TIMESTAMP,
 failure_type VARCHAR(160)
);
CREATE INDEX idx_kyc_onboarding_due ON kyc_onboarding_jobs(status,next_attempt_at);
