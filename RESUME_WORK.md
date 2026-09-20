# Entertain Lawyers - Development Handover & History

## Project Context
Entertain Lawyers (https://www.entertainlawyers.com/) is a Nepalese legal education platform. The goal is to evolve the new Next.js application from a simple resource catalogue into a genuine law-student study platform.

**Tech Stack**: Next.js App Router, React, TypeScript, Tailwind CSS, Prisma/PostgreSQL, Auth.js, Cloudflare R2, eSewa/Khalti payments.

## Completed Milestones (1 - 3B)
- Authentication and authorization (Auth.js v5 credentials strategy).
- PostgreSQL + Prisma setup.
- Resource/domain models (Semesters, Subjects, Resources).
- Premium Entitlements & Subscription lifecycle.
- Private R2 document storage and Secure PDF delivery.
- PDF.js viewer with visual watermark.
- Payment integration (eSewa & Khalti sandboxes) with verification and idempotency.

## Current Assignment: Evolving to a Study Platform (Phase 1, 2, 3)
The goal is to implement a 3-level study selector (`Semester → Subject → Unit`) and organize resources by `ResourceType` (Law Notes, Case Laws, Old Questions).

**CRITICAL RULES**:
- Do NOT implement reading progress (Phase 4) yet.
- Do NOT create a separate CaseLaw or QuestionBank model yet. Treat them as Resources with a `ResourceType`.
- Do NOT invent curriculum content or unit titles. Use what's seeded/scraped from the real site.
- Do NOT redesign existing security, payment, or entitlement logic.
- Empty states must remain professional.

## What Has Been Completed in the Current Session
1. **Prisma Schema Updated**: 
   - Added `ResourceType` enum (`LAW_NOTE`, `CASE_LAW`, `OLD_QUESTION`, `OTHER`).
   - Added `type`, `order`, and `unitId` to `Resource`.
   - Added `Unit` model (`id`, `name`, `title`, `order`, `subjectId`).
2. **Database Migrated and Seeded**:
   - Ran `npx prisma migrate dev --name add_units_and_resource_types`.
   - Updated `prisma/seed.ts` to populate actual units (e.g., Unit 1-7 + Prescribed Cases for Criminal Law) and ran `npx tsx prisma/seed.ts`.
3. **Frontend Components**:
   - Created `src/components/study/StudySelector.tsx` (Client-side 3-level selector using URL search params).

## Work Remaining for Phases 1, 2, and 3
You need to pick up the implementation exactly from here. Ensure you reuse existing components and keep credit usage efficient.

### To Be Implemented:
1. **`/study` Page (Phase 1 & 2)**
   - Create `src/app/study/page.tsx` incorporating the `StudySelector`.
   - Implement `ResourceTypeFilter` (Tabs/pills for Notes / Case Laws / Old Questions).
   - Fetch and display filtered resource results based on URL params.
2. **Homepage & Navigation Updates (Phase 1)**
   - Add a "Start Studying" CTA on the homepage (`/`) linking to `/study`.
   - Update `src/components/layout/Navbar.tsx` to include a "Study" link.
3. **Resource & PDF Pages (Phase 1 & 3)**
   - **Enhanced Breadcrumbs**: Format as `Semester › Subject › Unit › Resource` in `/resources/[id]/page.tsx` and `/read/[resourceId]/page.tsx`.
   - **Previous/Next Navigation**: Add previous/next resource navigation (`<PrevNextNav />`) on both pages.
   - **Study Outline**: Add a `<StudyOutlineSidebar />` (collapsible unit/chapter list) in the PDF reader.
4. **Semester Details (Phase 3)**
   - Update `src/app/semesters/[id]/page.tsx` to display unit-level sections if units exist.
5. **Admin Portal (Phase 2 & 3)**
   - Update the admin resource creation/editing forms (e.g., `src/app/admin/resources/new/page.tsx`) to allow selecting a `ResourceType` and a `Unit`.

## Instructions for Next Session
1. Read this document thoroughly.
2. Review `src/components/study/StudySelector.tsx` to understand the state management approach.
3. Begin by implementing the `/study` page.
4. When finished with the outlined remaining work, run `npx tsc --noEmit` and `npm run build` to verify, then stop.
