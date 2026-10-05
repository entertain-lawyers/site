# PHASE 12 BATCH 1 - ADMIN AUDIT REPORT

## 1. Executive Summary
An exhaustive read-only audit of the existing `/admin` subsystem has been completed. The repository contains a substantial foundational structure for an Admin Panel, but much of the functionality requires wiring to the real Neon database, thorough error handling, and complete data safety checks.

## 2. Route Protection & RBAC
### Frontend Route Protection
- **Status**: Implemented.
- **Details**: `src/app/admin/layout.tsx` successfully intercepts all requests under `/admin` and performs a server-side redirect to `/` if the user is not authenticated or does not possess the `ADMIN` or `EDITOR` role. This protects all child routes (including `/admin/events/new` which are marked `'use client'`).

### Server Actions (Mutations)
- **Status**: Partially Implemented / Architecturally Sound.
- **Details**: Server actions in `src/modules/admin/*.actions.ts` use a `createSafeAction` wrapper. While the wrapper itself supports `requireAuth` and `requireAdmin` flags, the individual actions currently manually assert `if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) { throw new Error(...) }`. This successfully enforces RBAC on mutations.
- **Action Required**: The manual checks are functional, but we should standardise on the `createSafeAction` configuration options (`requireAdmin: true`) where applicable to ensure absolute security and prevent bypasses.

## 3. Route Inventory & State

| Route | Status | Notes |
|-------|--------|-------|
| `/admin` | Functional | Dashboard is rendering actual counts from Prisma (`prisma.post.count`, `prisma.resource.count`, etc.). Some sections are conditionally rendered based on `ADMIN` vs `EDITOR` role. |
| `/admin/study/*` | Functional/Partial | CMS taxonomy (Semesters, Subjects, Units) pages exist. Actions for CRUD operations exist in `admin-semester.actions.ts`, etc. Needs strict testing against the 155 migrated resources to ensure no missing dependencies. |
| `/admin/resources` | Mocked/Placeholder | Needs full wiring to the real Database to search, filter, and manage the 155 resources and their documents. |
| `/admin/posts` | Functional/Partial | Listing and creation exist. Needs verification of media upload integration, slugs, and SEO fields. |
| `/admin/events` | Functional/Partial | Basic forms exist. Needs date validation, media wiring, and status lifecycle verification. |
| `/admin/publications` | Functional/Partial | Basic forms exist. Needs verification of document attachments. |
| `/admin/gallery` | Functional/Partial | Forms exist. Needs image upload wiring. |
| `/admin/faqs` | Functional/Partial | Forms exist. Needs reordering logic verified. |
| `/admin/audit-logs`| Functional | Reads from `prisma.auditLog`. |
| `/admin/users` | Functional | Needs pagination and safe role management. |

## 4. Key Gaps Identified
1. **Media Uploads**: The existing `admin-media.actions.ts` lacks proper B2 wiring or relies on generic `local-upload-proxy`. Needs strict MIME/size validation and safe key generation.
2. **Safe Deletion**: Deletion actions (e.g., `deleteSemesterAction`) currently rely on Prisma to throw a `P2003` foreign key error, which they catch to return a user-friendly message. We must ensure this pattern is robustly implemented across all entities (especially Resources and Posts) so that financial/audit data is never orphaned.
3. **Empty States & Feedback**: Forms use basic HTML5 validation and generic Zod errors. Skeletons and `react-toastify` (or similar) are needed for premium SaaS feel.
4. **Data Isolation**: Must ensure that querying the lists does not arbitrarily filter out `NULL`-subject resources.

## 5. Next Steps
Move to execution phase focusing on:
1. Hardening Server Actions.
2. Enabling the real Study CMS and Editorial CMS.
3. Securing B2 media uploads.
4. Implementing safe-deletion guardrails.
5. Verifying the flow against the remote Neon database.
