CREATE TABLE transfer_jobs (
    transaction_id BIGINT PRIMARY KEY REFERENCES transactions(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_transfer_jobs_ready ON transfer_jobs (created_at, transaction_id) WHERE finished_at IS NULL;
