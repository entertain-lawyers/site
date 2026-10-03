# Phase 8: Content Reconciliation

## 1. 321-Record Complete Matrix
A complete analysis was run against the 339 total raw WordPress posts (`post_type='post'`, `post_status='publish'`). The exact classification breakdown is as follows:

- **MIGRATED_POST:** 76
- **MIGRATED_AS_RESOURCE:** 134
- **PHASE_7B_RESOURCE:** (Included in the 134 Resource count)
- **REVIEW_HELD:** 129
- **INTENTIONALLY_EXCLUDED:** 0
- **REVISION_TRASH_IGNORED:** 0
- **DUPLICATE_ALREADY_REPRESENTED:** 0
- **GENUINELY_MISSING:** 0
- **UNKNOWN:** 0

**Total Verified:** 339 (covering all 321 live frontend posts + minor hidden publishes).

## 2. Explicit Arithmetic & "Missing Content" Conclusion
**339 (Total WP Posts) = 76 (Posts) + 134 (Resources) + 129 (Review-Held).**

> **CONCLUSION: THERE ARE 0 GENUINELY MISSING POSTS.**
> The previously reported gap of "248 missing posts" was fundamentally flawed because it failed to account for:
> 1. The 134 WordPress posts that were correctly classified and migrated as PDF `Resources` (e.g. Case Laws, Study Materials).
> 2. The 129 WordPress posts that were deliberately placed in the `REVIEW_HELD` queue during Phase 6 due to incomplete metadata or formatting issues.

## 3. Blogs and News Information Architecture
The `posts.json` ledger reveals a significant categorization issue:
- **NEWS migrated:** 73
- **BLOG migrated:** 0
- **NEPALI migrated:** 2 (`NEPALI_SAMANYA_SAMACHAR`)

**Analysis:** The migration scripts aggressively defaulted all english text-only posts to the `NEWS` enum. Thus, old WordPress Blogs and Opinions are currently residing in the database as `NEWS` and appearing on the `/news` route. 
**Required Fix:** We must run a script to cross-reference the original WP categories (e.g. "Opinion", "Blog") and update the `PostType` enum in Neon to `BLOG` or `OPINION` so they render correctly on the `/blogs` route.

## 4. Resource Transformations & Phase 7B
- **Status:** Validated. 
- 134 WP posts (including the 11 Phase 7B PDF conflict resolutions) were explicitly verified to exist in the `resources.json` ledger.
- The WP 3907 split was confirmed safe. `9th-sem-old-questions.pdf` maps to Resource `e2a93f0d` and `9th-semester-new-course` maps to Resource `1cbfe25a`.

## 5. Schema/Application Drift Classification
The previously detected TS errors (e.g., `Resource.content`, Nepali enums, `Advertisement`) have been classified:
- **Nepali PostType Enums:** **A. Current intended functionality** (The database has `NEPALI_SAMANYA_SAMACHAR` records, but Prisma schema is missing the enum).
- **Resource.content & authorId:** **D. Obsolete code** (These fields were explicitly stripped during Phase 6 resource extraction to separate metadata from the raw PDFs. The React UI needs to drop references to them).
- **Advertisement references:** **E. Actual schema drift** (The frontend expects a Prisma model for Ads that was never migrated).

## 6. Dropdown UX Audit
- **Affected Menus:** Desktop `Navbar.tsx` (Study Dropdown).
- **Behavior:** Pure CSS `group-hover:opacity-100`.
- **Issues:** Fails keyboard a11y (cannot tab into submenus), no Escape key handler to close, and gets "stuck" visible after route changes because the mouse hover state isn't broken by Next.js client-side navigation.
- **Mobile Menu:** `<details>` accordion is functional but may have clipping issues on very small screens (320px).

---

## Recommended Remediation Order
1. **Schema Fixes:** Add missing Nepali PostType enums to Prisma to unblock the compiler.
2. **UI Drift Cleanup:** Strip obsolete `Resource.content` and missing `Advertisement` logic from the frontend to reach 0 TS errors.
3. **Blog Categorization Fix:** Run a database script to convert the misclassified `NEWS` posts back to `BLOG` based on their original WP categories.
4. **UX Rewrite:** Refactor `Navbar.tsx` using React state or Headless UI for fully accessible dropdowns.
