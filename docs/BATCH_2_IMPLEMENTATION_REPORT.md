# BATCH 2 IMPLEMENTATION REPORT

## Overview
Batch 2 completes the implementation of the Study Taxonomy CMS. The primary objective was to build a comprehensive, safe, and production-grade Admin/Editor UI for managing Semesters, Subjects, Units, and Resources while adhering strictly to constraints around database integrity, RBAC policies, and historical data preservation.

## Schema Changes
- **Migration Name**: `20260926000001_subject_order`
- **Change**: Added `order Int @default(0)` to the `Subject` model.
- **Subject Ordering Strategy**: A deterministic SQL backfill was executed inside the migration to assign `order` values to existing subjects based on their logical alphabetical name sorting within their respective semesters.

## Admin Capabilities
- Added the Study section to the Admin Sidebar containing:
  - Semesters
  - Subjects
  - Units
  - Resources
- Fully capable of creating, reading, updating, and deleting Semesters, Subjects, and Units.
- Able to update Resources and replace PDF documents securely.

## Editor Capabilities
- Editors have identical capabilities to Admins for the Study section.
- **Ownership Note**: Ownership locks (`authorId === session.userId`) were not implemented. Any editor can maintain/edit content to ensure continuity of documentation in the event of personnel changes.

## Deletion Behavior
- **RESTRICT Enforcement**: Deleting a Semester, Subject, or Unit gracefully catches Prisma `P2003` constraint violations and surfaces a human-readable error ("Cannot delete this [Item] because it contains child items. Remove or move them first.") rather than crashing or deleting children.
- **Resource Deletion**: The unsafe `deleteMany` operations that wiped out purchases, entitlements, and access logs were removed. Physical deletion of a Resource now requires `purchaseCount === 0`, `entitlementCount === 0`, and `accessCount === 0`. Otherwise, it raises an error instructing the user to Archive the resource instead.

## Document Replacement Lifecycle
- Replaced the hardcoded block on replacing documents.
- The new document is uploaded to R2.
- A new `Document` row is created in the database.
- The `Resource.documentId` is atomically swapped to the new document within a Prisma transaction.
- The previous `Document` row and R2 object are intentionally preserved to maintain rollback safety and historical integrity for past access logs. (No garbage collection built yet).

## Public Status Verification
- All queries to public study endpoints (e.g. `/study`, `/read/[id]`, `/sitemap.xml`) were updated to explicitly query for `status: 'PUBLISHED'`.
- `DRAFT` and `ARCHIVED` resources are strictly hidden at the server level and cannot be accessed.

## Cache Invalidation
- Focused `revalidatePath('/study')` and `revalidatePath('/admin/study/*')` are executed in all server actions to ensure rapid Turpopack rendering without blanket wiping the whole cache.

## Admin Route Compatibility
- `/admin/resources` was successfully moved to `/admin/study/resources`.
- A compatibility Next.js server-side redirect was retained at `src/app/admin/resources/page.tsx` pointing to the new location to prevent broken bookmarks or external links.

## Quality Assurance
- **TypeScript**: `npx tsc --noEmit` completes with 0 errors.
- **Production Build**: `npm run build` completes successfully.
- **Data Integrity**: All RESTRICT constraints from Batch 1 remain authoritative and un-bypassed.

## Remaining Risks
- The frontend forms for `Semester/Subject/Unit` are currently functional but use un-styled browser default alerts to handle errors. We may want to improve this UX with toast notifications in future batches.

## Final Status
**BATCH 2 COMPLETE — READY FOR VERIFICATION**
