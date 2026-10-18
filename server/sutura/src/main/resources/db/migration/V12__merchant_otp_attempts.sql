ALTER TABLE merchant_registration_sessions ADD COLUMN IF NOT EXISTS failed_verification_attempts INTEGER NOT NULL DEFAULT 0;
