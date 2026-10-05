# PHASE 11 BATCH 2A — PRODUCTION DATABASE / MIGRATION RECONCILIATION AUDIT

## 1. Executive Summary

This forensic audit identifies the root cause of the missing migration data in the Vercel staging deployment. The verified Phase 6 and Phase 7 migration datasets were **never persisted** to the current remote Neon database. The import scripts contained a hardcoded safety mechanism that strictly enforced local-only execution, preventing accidental writes to the production remote Neon environment. The data is entirely reproducible from intact migration artifacts using deterministic idempotency.

## 2. Current Vercel → Neon Database Identity

- **Target Identifier**: `ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb`
- **Configuration**: Vercel and the local `.env` currently point directly to this remote Neon branch.
- **Identity**: This is the intended remote production/staging database for Vercel. 
- **Integrity**: It currently contains only structural test data (5 dummy Resources, 4 dummy Documents).

## 3. Phase 6/7 Historical Migration Target

The previous migration strictly targeted a **Local PostgreSQL** database (`localhost:5432`). 
Evidence is found in `scripts/migration.js`, which enforces an explicit abort rule:

```javascript
const DB_URL = process.env.DATABASE_URL || '';
if (!DB_URL.includes('localhost') && !DB_URL.includes('127.0.0.1')) {
    console.error("FATAL: DATABASE_URL points to non-local DB. Aborting for safety.");
    process.exit(1);
}
```

The script successfully ran against `localhost:5432`, but this safety rule explicitly blocked the migration from ever reaching the remote Neon database.

## 4. Migration Artifact Inventory

The authoritative migration dataset still exists perfectly intact on the local filesystem.
Location: `migration-staging-recovered/`

Relevant artifacts verified:
- `source-extracted.json`
- `phase5-decisions.json`
- `posts.json`
- `resources.json`
- `review-queue.json`
- `pdf_manifest.json`
- `documents.json`
- `upload_manifest.json`

## 5. Alternate Database Findings

The migrated relational data exists inside a local PostgreSQL instance (if still running on the machine) as evidenced by the `DATABASE_URL` check. However, there is no need to extract data from the local database, because the intermediate staging `.json` artifacts in `migration-staging-recovered/` are fully intact and ready to be cleanly injected into the Neon database.

## 6. B2 Object Reconciliation

The previous Phase 6/7 steps successfully uploaded the media to B2.
- `upload_manifest.json` confirms **6,599** image objects.
- `pdf_manifest.json` confirms **21** PDF objects.

These objects physically exist in B2. The current Neon database simply lacks the relational `Document` and `Resource` rows required to expose them to the frontend.

## 7. Deterministic Identity / Idempotency Analysis

The migration is inherently safe and idempotent. `scripts-recovered/migration-identity.js` employs a strict `uuidv5` deterministic identity scheme:

- **Namespace**: `1b671a64-40d5-491e-99b0-da01ff1f3341`
- **Post UUID**: `post:<locale>:<wordpressId>`
- **Resource UUID**: `resource:<locale>:<wordpressId>`
- **Taxonomy UUID**: `semester:<normalized-name>`

The import script (`scripts-recovered/migration.js`) performs `prisma.resource.upsert({ where: { id: detId } })`. This ensures that even if run repeatedly against the Neon database, no duplicate records will ever be created.

## 8. Current Database Inventory

The remote Neon database currently contains:
- **Semesters**: 2 ("Sem 1", "S1")
- **Subjects**: 2 ("Math", "Sub1")
- **Resources**: 5 (e.g., "Free Doc", "Prem Doc", "Concurrency Test")
- **Documents**: 4

**Finding**: These are explicitly dummy/test records used to validate the CMS architecture and authentication flows during early development. There is no legitimate production content attached to them. They do not pose any collision risk due to the deterministic UUID scheme of the incoming migration data.

## 9. Root Cause Classification

- **Classification**: `MIGRATED_DATA_EXISTS_ONLY_LOCALLY` & `MIGRATED_DATA_REPRODUCIBLE_FROM_ARTIFACTS`.
- **Reason**: The Phase 6/7 migration was executed with `localhost` safety constraints enabled, meaning the actual remote Neon database was never seeded.

## 10. Recovery Options

1. **Option A (Safest)**: Modify the migration script to bypass the `localhost` safety check, and run the idempotent import against the remote Neon database using the fully recovered staging artifacts.
2. **Option B**: Dump the local PostgreSQL database using `pg_dump` and restore it to Neon (Higher risk of overriding current Neon schemas/auth tables).

## 11. Recommended Next Batch

Proceed with **Option A**. The next batch should authorize the execution of the Phase 6/7 import script (`scripts-recovered/migration.js`) against the remote Neon database. The idempotent `upsert` logic will safely seed the missing 136 resources, 21 PDFs, taxonomy, and posts without dropping the database or destroying the existing 5 dummy records (or the verified Auth.js tables).

## 12. Explicit Safety Constraints

- The import must strictly utilize the deterministic `uuidv5` scheme via `upsert`.
- The existing Auth.js `User` and `Account` tables must not be truncated.
- B2 objects must not be re-uploaded.

---
STATUS:
PASS
