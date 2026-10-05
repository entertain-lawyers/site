# PHASE 11 BATCH 1C — STUDY TAXONOMY / RESOURCE FORENSIC AUDIT

## 1. Database Inventory

**Exact current counts:**
- Semester: 2
- Subject: 2
- Unit: 0
- Resource: 5
- Document: 4

**Resource Metrics:**
- Resource by ResourceType: `LAW_NOTE`: 5
- Resource by ContentStatus: `PUBLISHED`: 5
- Resource with subjectId NULL: 0
- Resource with subjectId NOT NULL: 5
- Resource with unitId NULL: 5
- Resource with unitId NOT NULL: 0
- Document-linked Resources: 4
- Resources without Documents: 1

**Hierarchy Mapping:**
- **Semester → Subject counts**:
  - Semester "Sem 1": 1 Subject
  - Semester "S1": 1 Subject
- **Subject → Unit counts**:
  - Subject "Math": 0 Units
  - Subject "Sub1": 0 Units
- **Unit → Resource counts**:
  - 0 Units exist, hence 0 Resources linked to Units.

## 2. Migration Ledger Reconciliation

**Comparison against Phase 6 / Phase 7 migration artifacts:**
- 136 Phase 6 Resources: **MISSING**
- 19 Phase 7B newly-created Resources: **MISSING**
- 1 existing Online Betting Resource: **MISSING**
- 21 PDF Documents: **MISSING**
- 21 PDF → Document → Resource relationships: **MISSING**
- 125 NULL-subject resources: **MISSING**
- 11 mapped resources: **MISSING**
- 152 review-held records: **MISSING**

**Conclusion:** All verified migrated records from Phase 6 and Phase 7 are completely absent from the current Neon database. The production database currently only contains 5 dummy test records. 

## 3. Public Frontend Query Audit

**Route Queries inspected:**
- `/study`
- `/study/[semester]`
- `/study/[semester]/[subject]`
- `/resources`
- `/resources/[id]`

**Query Behavior:**
- **ContentStatus filters**: The UI actively filters resources by `status: 'PUBLISHED'`. DRAFT or ARCHIVED resources will not display on public routes.
- **Empty Entities**: The frontend blindly pulls all `Semesters`, `Subjects`, and `Units` via `prisma.*.findMany()` without filtering out those lacking children. Empty taxonomy will render in the dropdowns.
- **Pagination**: None. All matching records are pulled into memory simultaneously.
- **NULL-subject Resources**: Resources without a `subjectId` or `unitId` are *not* intentionally excluded from the main query, but they lack structural hierarchy for the user to navigate to them via standard dropdowns.

## 4. Live Staging HTTP Check

Tested URLs against `https://entertainlawyers.vercel.app/`:

- `/`: HTTP 200 OK
- `/study`: HTTP 200 OK
- `/resources`: HTTP 200 OK
- `/pricing`: HTTP 200 OK
- `/blogs`: HTTP 200 OK

No visible server 500s or 404s were encountered on standard public routes. However, the site renders almost empty because the database lacks the expected content.

## 5. Document Delivery

**Migrated PDFs Reconciliation:**
- The 21 verified Phase 6/7 PDFs **DO NOT EXIST** in the database.
- Instead, 4 placeholder Document records exist in Neon (e.g., `documents/a37d2e12-dde6-413f-9c15-afe18066abe4-1791093238822.pdf`).
- Because the 21 migrated PDFs are missing from the relational database, they cannot be rendered by the protected reader route or exposed in the public UI. 

## 6. Image / Thumbnail Status

**Finding:** `NOT_A_BUG` / `ABSENT_IN_SOURCE_DATA`
- Missing Resource images are not a defect in the image pipeline. The `Resource` Prisma schema physically does not have an `image` or `thumbnail` field. 
- The frontend UI utilizes vector icons (`lucide-react`) to represent `ResourceType` visually on the cards rather than rendering thumbnails. 
- Missing image anomalies in Resources are entirely architectural by design.

## 7. Performance

**Representative Staging Response Times:**
- `/`: 0.92s
- `/study`: 2.21s
- `/resources`: 1.83s
- `/pricing`: 0.75s
- `/blogs`: 0.94s

**Performance Root Causes:**
- The perceived lag on `/study` and `/resources` (1.8s - 2.2s) is primarily attributed to **DB query time** and **dynamic rendering**. 
- The unbounded `prisma.resource.findMany()` and sequential hierarchy queries execute dynamically on a remote Neon serverless database, causing significant pre-render blocking.

## 8. Classification of Issues

- **Missing Semesters, Subjects, Units, and Resources**: `DATA_MISSING`
- **Missing 21 PDFs**: `DATA_MISSING`
- **Missing Resource Thumbnails**: `NOT_A_BUG` (By design)
- **Slow Page Loads (Study/Resources)**: `PERFORMANCE` (Unbounded dynamic queries)

---
OVERALL STATUS:
PARTIAL
