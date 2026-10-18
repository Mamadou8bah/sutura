-- Apply before starting a deployment with spring.jpa.hibernate.ddl-auto=validate.
-- Local development using ddl-auto=update creates this table automatically.
CREATE TABLE IF NOT EXISTS kyc_verifications (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    sentinel_session_id BIGINT NOT NULL UNIQUE,
    external_customer_id VARCHAR(255) NOT NULL,
    sentinel_customer_id BIGINT,
    status VARCHAR(255) NOT NULL,
    hosted_url VARCHAR(2048) NOT NULL,
    explanation VARCHAR(4096),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
