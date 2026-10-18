ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS payer_id BIGINT;
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS payer_wallet_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_links_reference ON payment_links(reference);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_links_transaction ON payment_links(transaction_reference) WHERE transaction_reference IS NOT NULL;
-- Historical links keep their configured URL; newly created links use /pay/<reference>.
