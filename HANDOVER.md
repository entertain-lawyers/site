# Project Handover: Entertain Lawyers

This document provides complete context for continuing the development of the Entertain Lawyers platform. Read this to understand the project architecture, completed milestones, and current status.

## 1. Project Overview
**Name**: Entertain Lawyers (Rebuild of entertainlawyers.com)
**Target Audience**: Law students (BA.LLB / LLB) in Nepal.
**Aesthetic Goal**: "Premium legal publication + modern academic library + professional digital legal platform." (Navy #1a365d and Gold #c9a227 branding, clean light mode, professional typography using Inter).

### Tech Stack
- **Framework**: Next.js App Router (React, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Auth.js v5 (using Credentials provider with JWT session strategy, database-backed roles enforced in the session callback)
- **Storage**: Cloudflare R2 (Private bucket)
- **Payments**: eSewa (ePay v2) and Khalti (ePayment v2) sandboxes

## 2. Completed Backend Work (Milestones 1, 2, 3A, 3B)
The backend architecture is complete, heavily audited, and locked down with 60+ integration/regression tests. 

**Key Features Implemented:**
- **Entitlements Core**: `canAccessResource` (in `entitlement.service.ts`) is the authoritative source for document access.
- **PDF Upload Lifecycle**: `UploadIntent` creation → Client-side R2 direct upload → `confirmDocumentUpload` (verifies existence/metadata) → Database record finalization.
- **Secure Document Delivery**: `getSecureDocumentUrl` generates short-lived R2 signed URLs. Client uses `SecurePdfViewer` (PDF.js) with visual watermarking.
- **Payments (eSewa & Khalti)**: Strict server-side callback verification, amount matching, and atomic finalization. 
- **Monetization**: Support for single PDF purchases (`Purchase`) and duration-based subscriptions (`Subscription` / `Plan`).

*Note: Do NOT modify or weaken the existing security boundaries, entitlement checks, or payment verification flows.*

## 3. Current Work: Milestone 3C (Frontend UI/UX)
The goal of Milestone 3C is to replace the backend-focused boilerplate with a production-ready, professional UI that matches the actual content structure of the live website.

### Progress So Far:
1. **Content Research**: Extracted the real semantic structure from the live site (10 Semesters, Law Notes, Case Laws, Old Questions).
2. **Database Seeded**: Created the 10 semesters and 50 related subjects in the database.
3. **Layout & Branding**: Completely rewrote `globals.css`, `layout.tsx`, `Navbar.tsx`, `Footer.tsx`, and `MobileMenu.tsx` with the new design system (Navy/Gold, Inter font, Tailwind).
4. **Core Pages Implemented**:
   - `src/app/page.tsx` (Homepage with hero, semester grid, feature list)
   - `src/app/resources/page.tsx` (Resource catalog)
   - `src/app/semesters/[id]/page.tsx` (Semester detail pages)
   - `src/app/about/page.tsx`, `contact/page.tsx`, `privacy-policy/page.tsx`
5. **Application Pages Implemented**:
   - `src/app/resources/[id]/page.tsx` (Resource details with checkout buttons)
   - `src/app/read/[resourceId]/page.tsx` (Secure PDF viewer wrapper)
   - `src/app/pricing/page.tsx` (Subscription plans)
   - `src/app/dashboard/page.tsx` (User dashboard showing subs and purchases)
   - `src/app/admin/*` (Admin dashboards and resource management)
6. **Stability**: Fixed an early `Auth.js` strategy bug. The TypeScript compiler (`npx tsc --noEmit`) currently passes with zero errors.

## 4. Next Steps for the New Agent
The heavy lifting of generating the frontend components has just finished. You are stepping in right after the new UI files were created.

**Immediate Tasks:**
1. **Build and Test**: Run `npm run build` or `npm run dev` to verify that the newly generated frontend components render correctly without runtime errors.
2. **Visual QA**: Verify that the new UI matches the requested "premium academic" aesthetic. 
3. **E2E Flow Testing**: Walk through the user journey (Login -> Browse Catalog -> View Semester -> Purchase/Subscribe -> Read PDF) to ensure the newly stitched UI components communicate correctly with the existing backend actions.
4. **Polish**: Fix any responsive design issues on mobile or missing empty states.

*Note: You do not need to invent fake data. The database has been seeded with the real curriculum structure. If there are no resources/PDFs, display professional empty states.*
