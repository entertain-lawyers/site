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
    expect(sql).not.toMatch(/^\s*(DROP|TRUNCATE|DELETE)\s+(TABLE|FROM)\b/im);
  });

  it('has an additive profile and intake migration with a safe nullable lawyer relationship', () => {
    const followUp = join(root, 'prisma/migrations/20261109120000_expand_consultation_profiles_and_intake/migration.sql');
    expect(existsSync(followUp)).toBe(true);
    const sql = readFileSync(followUp, 'utf8');
    for (const column of ['serviceCities', 'lawFirm', 'officeAddress', 'officeMapUrl', 'facebookUrl', 'instagramUrl', 'linkedInUrl', 'websiteUrl', 'achievements', 'whatsappNumber', 'permanentAddress', 'temporaryAddress', 'lawyerId']) {
      expect(sql).toContain(`"${column}"`);
    }
    expect(sql).toMatch(/FOREIGN KEY \("lawyerId"\)[\s\S]*REFERENCES "ConsultationLawyer"\("id"\)\s+ON DELETE SET NULL/i);
    expect(sql).not.toMatch(/^\s*(DROP|TRUNCATE|DELETE)\s+(TABLE|FROM)\b/im);
    expect(schema).toMatch(/lawyer\s+ConsultationLawyer\?\s+@relation\(fields: \[lawyerId\], references: \[id\], onDelete: SetNull\)/);
  });
});
