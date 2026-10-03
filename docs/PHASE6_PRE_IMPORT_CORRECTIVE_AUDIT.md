# PHASE 6 PRE-IMPORT CORRECTIVE AUDIT

## 1. Actual Neon Resource.subjectId Nullability
**Status:** `NOT NULL`
Neon's physical database schema does not allow `null` for `Resource.subjectId`.

## 2. Prisma Resource.subjectId Nullability
**Status:** `String` (NOT NULL)
`prisma/schema.prisma` defines it as a required field without the optional `?` modifier.

## 3. Migration SQL Resource.subjectId Nullability
**Status:** `TEXT NOT NULL`
`prisma/migrations/0_init/migration.sql` originally created the `Resource` table with the constraint: `"subjectId" TEXT NOT NULL`. No subsequent migration ever issued a `DROP NOT NULL` statement.

## 4. Exact Cause of the Mismatch
The original `0_init` schema (Phase 1) was authored under the strict assumption that every `Resource` must belong to a `Subject`. However, the Phase 5 taxonomy classification process identified 125 legacy WordPress records that lacked any clear taxonomy and designated them as `NULL_SUBJECT_CANDIDATE`. 

The discrepancy occurred because the structural database schema was never updated to accommodate the relaxed Phase 5 business requirements. The database remained `NOT NULL`, while the migration logic explicitly intended to insert `null`.

## 5. Exact 73-Post Provenance
The 73 Posts accidentally inserted during the legacy script bypass were completely mapped.
- **Accidental posts detected:** 73
- **Legitimate approved migration records:** 73
- **Duplicates:** 0
- **Unexpected records:** 0

The original dataset contained 75 posts. The 73 inserted records are perfectly legitimate. The remaining 2 posts were skipped/crashed the old script because their type was `NEPALI_SAMANYA_SAMACHAR`, which is invalid under the new Neon `PostType` enum. 

## 6. Review-held Contamination Check
- **Review-held records accidentally inserted:** 0
The 152 items held in the `review-queue.json` did not breach the import pipeline.

## 7. Duplicate Check
- **Duplicate Records:** 0
Because `id` is a primary key, duplicate insertions of the same UUID are impossible, proving UUIDv5 determinism prevented data duplication during the crash.

## 8. Taxonomy State
- **Semesters:** 0
- **Subjects:** 0
- **Units:** 0
Neon taxonomy tables remain completely empty.

## 9. Current Production Row Counts
- **Posts:** 73
- **All other tables:** 0

## 10. Modification of Other Tables
Forensic checks explicitly verified that no other tables (`User`, `Resource`, `AuditLog`, `PaymentTransaction`, `Document`) received writes.

## 11. Recommended Corrective Action
**Blocker 1 (Subject Nullability):**
We must generate a formal Prisma schema migration to change `subjectId` to `String?` (nullable) and apply it to Neon (`ALTER TABLE "Resource" ALTER COLUMN "subjectId" DROP NOT NULL;`). This aligns the physical database constraints with the verified Phase 5 migration policy. 

**Blocker 2 (73 Posts):**
No destructive rollback is required. Because the IDs are deterministic UUIDv5s, the refactored `migration.js` importer will safely execute `prisma.post.upsert` and overwrite these exact 73 rows without duplicating them, perfectly recovering the pipeline without truncating the database.

**PostType Hotfix:**
The 2 `NEPALI_SAMANYA_SAMACHAR` posts should be dynamically mapped to `NEWS` in `migration.js` so they successfully upsert.

---

**SAFE TO CONTINUE:** NO 
*(Blocked by unresolved `subjectId` schema nullability)*
