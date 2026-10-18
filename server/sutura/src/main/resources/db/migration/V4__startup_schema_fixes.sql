-- Existing PostgreSQL installations only. Fresh Hibernate schemas use billing_interval.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'subscriptions' AND column_name = 'interval')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema() AND table_name = 'subscriptions' AND column_name = 'billing_interval') THEN
        ALTER TABLE subscriptions RENAME COLUMN "interval" TO billing_interval;
    END IF;
END $$;
-- PostgreSQL index names are schema-wide; the old name collided with reconciliation_mismatches.
CREATE INDEX IF NOT EXISTS idx_risk_flags_created_at ON risk_flags(created_at);
