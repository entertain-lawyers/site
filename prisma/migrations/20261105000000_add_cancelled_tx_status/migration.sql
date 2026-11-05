-- Add a CANCELLED state so a payment the customer abandoned at the gateway
-- is not recorded identically to a payment the provider reported as failed.
-- Additive: no existing value is changed. PostgreSQL 12+ allows ADD VALUE
-- inside the migration transaction as long as the value is not used in it,
-- which is the case here.
ALTER TYPE "TxStatus" ADD VALUE "CANCELLED";
