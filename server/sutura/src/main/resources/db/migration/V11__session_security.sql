ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version BIGINT NOT NULL DEFAULT 0;
-- Invalidate pre-upgrade access tokens as well as legacy refresh tokens.
UPDATE users SET token_version = token_version + 1;
-- Legacy refresh hashes are intentionally invalidated; users must sign in again.
UPDATE refresh_tokens SET revoked = true WHERE token_hash NOT LIKE 'sha256:%';
