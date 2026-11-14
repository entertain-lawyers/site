# Task Checklist: Fix Study Navigation & Back Redirection Bugs

## Phase 1 — Reproduction & Root Cause Analysis
- [x] Reproduce the back redirect bug driving browser on production/local
- [x] Identify root causes in `src/app/read/[resourceId]/page.tsx` (`studyBackUrl` missing `type` and `semester`, empty breadcrumbs `> > >`)
- [x] Identify root causes in `src/app/resources/[id]/page.tsx` (missing `semester` relation, invalid breadcrumb links `/semesters/undefined`, blank subject header, unscoped next/prev navigation)

## Phase 2 — Implementation
- [x] Fix `src/app/read/[resourceId]/page.tsx`:
  - [x] Include `semester` in `prisma.resource.findUnique` query and fallback query
  - [x] Derive `studyBackUrl` using `resource.type`, `semesterId` (direct or via subject), `subjectId`, and `unitId`
  - [x] Fix breadcrumb rendering in reader: eliminate empty spans/separators, make breadcrumb items clickable links
  - [x] Only render `StudyOutlineSidebar` when `filteredUnits.length > 0`
- [x] Fix `src/app/resources/[id]/page.tsx`:
  - [x] Include `semester` in `prisma.resource.findUnique` query and fallback query
  - [x] Correctly handle resources with direct `semesterId` (like `OLD_QUESTION`) in breadcrumbs, JSON-LD schema, and headers
  - [x] Fix Next/Prev resource navigation query to scope by `semesterId` when `subjectId` is null

## Phase 3 — Verification & Testing
- [x] Add automated unit tests in `src/app/read/__tests__/read-page-navigation.test.ts`
- [x] Run unit and regression tests (`npx vitest run`) -> 639 tests passing
- [x] Run TypeScript check (`npx tsc --noEmit`) -> 0 errors
- [x] Run production build (`npm run build`) -> success
- [x] Verify fix by driving browser: navigate to Old Questions, click resource, verify clean breadcrumbs without `> > >`, click Go Back, verify redirect back to Old Questions

## Phase 4 — Branch & Pull Request
- [ ] Create git branch
- [ ] Commit changes with clear message
- [ ] Open PR without pushing until requested
