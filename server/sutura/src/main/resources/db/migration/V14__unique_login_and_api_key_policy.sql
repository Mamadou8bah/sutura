-- Resolve historical duplicate email identities before deploying; never merge them automatically.
CREATE UNIQUE INDEX uq_users_email_normalized ON users(lower(email)) WHERE email IS NOT NULL AND email <> '';
-- Human admin/customer/agent sessions may not bypass their login controls with long-lived API keys.
UPDATE apikey SET revoked = true WHERE user_id IN (SELECT id FROM users WHERE role NOT IN ('MERCHANT','DEVELOPER'));
