ALTER TABLE wallet_transaction ALTER COLUMN amount TYPE NUMERIC(19,4);
-- New transfers, reversals and payout holds/releases now create matching wallet history.
-- Historical missing rows must be reconstructed only from verified ledger traces;
-- never hide reconciliation mismatches by assigning a new opening balance.
