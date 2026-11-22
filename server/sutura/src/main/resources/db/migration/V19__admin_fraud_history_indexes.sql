CREATE INDEX IF NOT EXISTS idx_fraud_eval_payment_latest
    ON fraud_evaluation_logs (persisted_transaction_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_eval_reference_latest
    ON fraud_evaluation_logs (transaction_reference, id DESC);
