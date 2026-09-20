ALTER TABLE "PaymentTransaction" DROP CONSTRAINT IF EXISTS "PaymentTransaction_type_check";

ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_type_check" CHECK (
  ("status" = 'PENDING' AND "subscriptionId" IS NULL AND "purchaseId" IS NULL) OR
  ("status" != 'PENDING' AND "type" = 'SUBSCRIPTION' AND "subscriptionId" IS NOT NULL AND "purchaseId" IS NULL) OR
  ("status" != 'PENDING' AND "type" = 'PURCHASE' AND "purchaseId" IS NOT NULL AND "subscriptionId" IS NULL)
);