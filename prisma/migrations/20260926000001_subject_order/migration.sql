-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill deterministic ordering based on existing logical ordering (name ascending within semester)
WITH numbered AS (
  SELECT id, row_number() over (partition by "semesterId" order by "name" asc) - 1 as new_order
  FROM "Subject"
)
UPDATE "Subject"
SET "order" = numbered.new_order
FROM numbered
WHERE "Subject"."id" = numbered.id;
