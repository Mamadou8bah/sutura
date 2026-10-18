CREATE TABLE password_recovery_challenges (
 id VARCHAR(36) PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id),
 code_hash VARCHAR(255) NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 token_version BIGINT NOT NULL,
 expires_at TIMESTAMP NOT NULL,
 created_at TIMESTAMP NOT NULL,
 used_at TIMESTAMP
);
CREATE INDEX idx_recovery_expiry ON password_recovery_challenges(expires_at);
