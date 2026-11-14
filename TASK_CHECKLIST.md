# Resource Placement Audit & Repair Checklist

## Phase 1 — Investigate
- [x] Inspect study-resource pages, server components, and queries (Semester -> Subject -> Resources, and Search)
- [x] Inspect database records: Semesters, Subjects, Units, Resources, Documents
- [x] Trace original WordPress IDs / categories from staging JSON files and migration scripts
- [x] Analyze 4th Semester duplicate "Family Law" subject, resource foreign keys, and empty original entry
- [x] Investigate why search finds resources that normal browsing cannot
- [x] Verify Document records, storage providers, Cloudflare R2 / storage keys, and file URLs

## Phase 2 — Establish Canonical Mapping
- [x] Extract and verify mapping: WP terms/categories -> Canonical Semester -> Canonical Subject -> Units -> Resource Types
- [x] Cross-reference original syllabus / curriculum vs current database state across all semesters (1-10)
- [x] Document duplicate subjects and resolution strategy (preserving all resources and files)

## Phase 3 — Repair & Reconcile
- [x] Build safe repair script with dry-run mode and verification checks
- [x] Reassign resources from duplicate subjects to canonical subjects
- [x] Ensure correct semester and unit associations for all resources
- [x] Ensure correct resource types (`LAW_NOTE`, `OLD_QUESTION`, `CASE_LAW`, `OTHER`)
- [x] Safely clean up / merge duplicate subjects without data loss
- [x] Verify no orphaned resources or broken foreign keys

## Phase 4 — Full Audit Across All Semesters
- [x] Audit Semesters 1 through 10 (and any others)
- [x] Check for duplicate subjects across all semesters
- [x] Check for orphaned resources (null subject, null semester, or mismatch)
- [x] Check search vs normal browsing parity for every semester and subject
- [x] Verify document storage keys and file accessibility

## Phase 5 — Tests & Verification
- [x] Add automated tests for curriculum hierarchy, resource placement, search consistency, and resource type filters
- [x] Run Vitest test suite (`npm run test` / `npx vitest run`)
- [x] Run TypeScript checks (`npm run type-check` / `npx tsc --noEmit`)
- [x] Run production build (`npm run build`)

## Phase 6 — Final Verification & Report
- [x] Verify site endpoints and browsing navigation
- [x] Generate comprehensive final report covering all 8 required sections