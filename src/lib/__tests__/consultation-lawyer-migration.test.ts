import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * `ConsultationLawyer` was created with `prisma db push` in development, so no
 * migration ever created it. Production therefore had the model in Prisma
 * Client but not the table, and both /admin/lawyers and /consultation failed
 * with P2021. The model and an additive migration must stay in sync.
 */
describe("ConsultationLawyer migration", () => {
  const root = join(process.cwd());
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  const migrationPath = join(
    root,
    "prisma/migrations/20261030120000_add_consultation_lawyer/migration.sql"
  );

  it("is declared in the Prisma schema", () => {
    expect(schema).toMatch(/model\s+ConsultationLawyer\s*\{/);
  });

  it("has a migration that creates the table and its unique slug index", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/CREATE TABLE "ConsultationLawyer"/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX "ConsultationLawyer_slug_key"/);
    expect(sql).toMatch(/CREATE INDEX "ConsultationLawyer_isAvailable_displayOrder_idx"/);
    // Additive only: this migration must never drop production data.
    expect(sql).not.toMatch(/\b(DROP|TRUNCATE|DELETE)\b/i);
  });
});
