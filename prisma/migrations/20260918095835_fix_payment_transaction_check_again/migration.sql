ALTER TABLE "PaymentTransaction" DROP CONSTRAINT IF EXISTS "PaymentTransaction_type_check";

ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_type_check" CHECK (
  ("status" != 'COMPLETED' AND "subscriptionId" IS NULL AND "purchaseId" IS NULL) OR
  ("status" = 'COMPLETED' AND "type" = 'SUBSCRIPTION' AND "subscriptionId" IS NOT NULL AND "purchaseId" IS NULL) OR
  ("status" = 'COMPLETED' AND "type" = 'PURCHASE' AND "purchaseId" IS NOT NULL AND "subscriptionId" IS NULL)
);