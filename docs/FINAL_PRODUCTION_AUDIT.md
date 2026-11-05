# FINAL PRODUCTION AUDIT REPORT
## Entertain Lawyers — `fix/final-production-hardening` (branch from `origin/main@aac962a`)

**Date:** 2026-11-05  
**PR:** https://github.com/entertain-lawyers/site/pull/51  
**Base:** `main`  
**Test Suite:** 579 tests pass | 99 skipped (678 total across 63 test files)  
**TypeScript:** Clean compile (`tsc --noEmit` exits 0)  
**ESLint:** Clean on all changed files (0 errors, 0 warnings)  
**Prisma:** Schema valid (`prisma validate` passes)  
**Build:** Production build passes (72/72 routes compiled and optimized)  

---

## 1. FEATURE INVENTORY (Verified Working)

| Area | Status | Evidence |
|------|--------|----------|
| **Public routes** (/, /study, /resources, /blogs, /news, /nepali, /events, /publications, /faqs, /gallery, /team, /semesters, /calculator, /search, /pricing, /consultation) | **PASS** | All return 200, CSP nonce present, correct metadata |
| **Auth** (register, login, email verification, password reset, session) | **PASS** | Unit tests 100%, credentials flow + Google OAuth |
| **Admin Panel — Posts** (CRUD, EN/NP, preview, publish/unpublish, trash, bulk actions) | **PASS** | Server actions enforce ADMIN/EDITOR, WordPress writes verified |
| **Admin Panel — Resources** (CRUD, premium/free, PDF upload, featured image, author) | **PASS** | Entitlement gate, document upload lifecycle tests pass |
| **Admin Panel — Study taxonomy** (semesters, subjects, units, merge) | **PASS** | Cache invalidation tags wired (including `RESOURCES_CACHE_TAG`), destructive merge requires CONFIRM |
| **Admin Panel — Events, Publications, Galleries, FAQs, Team, Pages, Redirects** | **PASS** | All CRUD actions have role checks + audit logs |
| **Admin Panel — Users & Roles** (create, update, delete, demotion guards) | **PASS** | Last-admin protection, sessionVersion bump on role change |
| **Admin Panel — Consultation Lawyers & Requests** | **PASS** | EDITOR can view requests, ADMIN manages lawyers |
| **WordPress Integration** (EN/NP separate creds, /users/me fallback, media) | **PASS** | Write blocking on preview/readonly, auth errors surfaced |
| **File Storage** (B2 private documents/, public editorial/gallery/publications) | **PASS** | Explicit 4-case contract tested; lazy initialization; B2 selected on `STORAGE_ENABLED=true` |
| **Payments** (eSewa, Khalti sandbox, idempotency, verification, entitlements) | **PASS** | 17 regression tests for gateway semantics; CSP permits eSewa form POST |
| **AI Chat/Index** | **BLOCKED** | Requires GEMINI/GROQ/OPENROUTER creds (not in local env) |
| **Email/SMTP** | **BLOCKED** | Requires SMTP creds |
| **Rate Limiting (Upstash)** | **BLOCKED** | Requires UPSTASH_REDIS_REST_URL/TOKEN |
| **Vercel Speed Insights** | **BLOCKED** | Requires production traffic |

---

## 2. BUGS FOUND & FIXED

### Critical & High Fixes

| # | Issue | Root Cause | Fix | Verification |
|---|-------|------------|-----|--------------|
| 1 | Migration SQL syntax error: `ADD VALUE "CANCELLED"` used double quotes | In PostgreSQL, enum string values require single quotes; double quotes are identifiers and cause `ERROR: syntax error at or near ""CANCELLED""` | Changed to `ALTER TYPE "TxStatus" ADD VALUE 'CANCELLED';` | Verified on PostgreSQL 17 disposable database: invalid double-quoted SQL reproduces syntax error; corrected single-quoted SQL applies cleanly and updates enum to `{PENDING,COMPLETED,FAILED,CANCELLED}` |
| 2 | eSewa payment form submissions blocked by CSP `form-action 'self'` | eSewa ePay v2 requires a form POST to external endpoints (`epay.esewa.com.np` in production, `rc-epay.esewa.com.np` in sandbox); strict `'self'` policy prevented checkout | Added `https://epay.esewa.com.np` and `https://rc-epay.esewa.com.np` to `form-action` directive in `src/lib/csp.ts` | Unit test in `src/modules/admin/__tests__/csp-upload.test.ts` confirms exact origins are permitted while wildcards and arbitrary domains remain blocked |
| 3 | eSewa `NOT_FOUND` from status API marked transaction `FAILED` (race: gateway not yet registered tx) | Terminal failure list included `NOT_FOUND` | Removed `NOT_FOUND` from terminal list; stays PENDING for later COMPLETE callback | Regression tests: NOT_FOUND → pending, CANCELED → cancelled |
| 4 | Khalti amount mismatch on *Pending* payment recorded `FAILED` | Amount check ran before status check | Reordered: status first → only fail mismatch on Completed/terminal | Khalti test: mismatch on Pending → stays pending |
| 5 | Failed/expired PDF upload intents left orphaned objects in B2 `documents/` | `markUploadIntentFailed` only flipped DB status | On verification failure, delete the object if no Document references it | Integration test: invalid PDF → object removed |
| 6 | `/resources?page=N` input parsing allowed integer overflow and unsafe database skips | `parseInt()` accepted inputs beyond `Number.MAX_SAFE_INTEGER` and 32-bit PostgreSQL OFFSET limits | Added strict positive integer validation, JS safe-integer check, and database 32-bit offset range guard in `src/app/resources/pagination.ts`; invalid or impossible page numbers trigger `notFound()` before any database query | 8 unit tests in `src/app/resources/__tests__/pagination.test.ts` verify normal, negative, decimal, malformed, extremely large, and offset-boundary inputs |
| 7 | Semester merge moved resources and subjects but did not invalidate `RESOURCES_CACHE_TAG` | `admin-semester-merge.actions.ts` only invalidated `SEMESTERS_CACHE_TAG` and `SUBJECTS_CACHE_TAG` | Imported `RESOURCES_CACHE_TAG`, revalidated after transaction commit, and added `/resources` path revalidation | Unit test in `src/modules/admin/__tests__/admin-semester-merge.test.ts` asserts `resources`, `subjects`, and `semesters` tags are invalidated |
| 8 | Storage configuration inconsistency: `STORAGE_ENABLED=true` comment claimed staging B2 support, but code returned `LocalStorageAdapter` for all non-prod | Implementation only inspected `NODE_ENV === 'production'` without evaluating `STORAGE_ENABLED` in staging/dev | Implemented explicit 4-case contract in `src/lib/storage/index.ts` and `src/env.ts`; B2 adapter is selected whenever `STORAGE_ENABLED=true` regardless of `NODE_ENV` after credential validation; production requires `STORAGE_ENABLED=true` | 7 unit tests in `src/lib/storage/__tests__/storage-config.test.ts` test all 4 contract cases, credential validation, and secret masking |
| 9 | CSP used static `unsafe-inline` in `script-src`; nonce never applied | Replaced static config with per-request nonce in `src/lib/csp.ts` and `src/proxy.ts` | Nonce extracted by Next.js 16.4.3 from CSP request header; static `unsafe-inline` eliminated from production `script-src` | Tested with Vitest and live builds |
| 10 | Admin document upload had no ownership re-check on confirm (only presign) | `confirmDocumentUpload` validates `intent.adminId === userId` | Role and user identity verified on confirmation | Existing test confirms cross-user confirm rejected |

---

## 3. STORAGE CONFIGURATION CONTRACT

| Environment | `STORAGE_ENABLED` | Expected Adapter | Behavior |
|---|---|---|---|
| Development/test | `'false'` (or unset) | `LocalStorageAdapter` | Files stored locally; no external B2 calls |
| Development/test | `'true'` | `B2StorageAdapter` | B2 selected; requires valid `B2_*` credentials |
| Staging/production deployment | `'true'` | `B2StorageAdapter` | B2 selected; requires valid `B2_*` credentials |
| Production | `'false'` or unset | **Throws configuration error** | Fails loudly; never silently falls back to local storage |

Credential validation rules:
- When storage is enabled (`STORAGE_ENABLED=true`), `B2_ENDPOINT`, `B2_ACCESS_KEY_ID`, `B2_SECRET_ACCESS_KEY`, and `B2_BUCKET_NAME` are strictly required.
- Errors name only the missing environment variable keys; secret values are never printed in logs or exceptions.

---

## 4. CONTENT SECURITY POLICY SPECIFICATION

- **`script-src`**: `'self' https://va.vercel-scripts.com 'nonce-{randomUUID}'` (`'unsafe-eval'` added in development only for React server error stacks).
- **`style-src`**: `'self' 'unsafe-inline'` (required for Quill editor dynamic formatting and dark/light theme classes).
- **`form-action`**: `'self' https://epay.esewa.com.np https://rc-epay.esewa.com.np` (permits signed form submission to eSewa gateways while blocking all unauthorized domains).
- **`object-src`**: `'none'`.
- **`base-uri`**: `'self'`.
- **`frame-ancestors`**: `'none'`.
- **`connect-src`**: `'self'`, Backblaze B2 endpoint, Vercel insights.
- **`img-src`**: `'self'`, Backblaze B2 endpoint, Gravatar, local domains.

---

## 5. PAGINATION AND HTTP STATUS VERIFICATION

- Ordinary pages (`?page=1`, `?page=2`) return HTTP 200 with 50 items per page and next-page sentinel detection.
- Pages beyond the end of existing resources (e.g., `?page=999`) trigger Next.js `notFound()`, producing an authentic HTTP 404 response status with the custom 404 page.
- Malformed, negative, decimal, or extreme inputs (e.g. `?page=-1`, `?page=1.5`, `?page=abc`, `?page=9999999999999999999`, `?page=9007199254740993`) are rejected by `parseResourcePage()` returning `null`, which immediately invokes `notFound()` before any database query is issued.

---

## 6. AUTOMATED TEST RESULTS

```
Test Files  58 passed | 5 skipped (63)
Tests       579 passed | 99 skipped (678)
```

**New / Updated test suites:**
- `src/modules/payments/providers/__tests__/gateway-verification-semantics.test.ts` (17 tests)
- `src/lib/storage/__tests__/storage-config.test.ts` (7 tests covering the 4 contract cases)
- `src/app/resources/__tests__/pagination.test.ts` (8 tests covering all pagination boundaries)
- `src/modules/admin/__tests__/csp-upload.test.ts` (9 tests covering CSP directives and eSewa form-action)
- `src/modules/admin/__tests__/admin-semester-merge.test.ts` (5 tests verifying cache invalidation post-commit)

---

## 7. DEPLOYMENT & MIGRATION INSTRUCTIONS

1. **Verify production environment variables**:
   ```
   DATABASE_URL, DIRECT_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL
   WP_ENGLISH_URL, WP_AUTH_USERNAME, WP_AUTH_APP_PASSWORD
   WP_NEPALI_URL, WP_NEPALI_AUTH_USERNAME, WP_NEPALI_AUTH_APP_PASSWORD
   B2_ENDPOINT, B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY, B2_BUCKET_NAME
   ESEWA_MERCHANT_ID, ESEWA_SECRET_KEY
   KHALTI_PUBLIC_KEY, KHALTI_SECRET_KEY
   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
   STORAGE_ENABLED=true, RATE_LIMITING_ENABLED=true, PAYMENTS_ENABLED=true
   ```
2. **Execute migration**:
   ```bash
   npx prisma migrate deploy
   ```
   Applies `20261105000000_add_cancelled_tx_status` (`ALTER TYPE "TxStatus" ADD VALUE 'CANCELLED';`) non-destructively to PostgreSQL.
3. **Deploy application**:
   Deploy branch `fix/final-production-hardening` to Vercel/Netlify.
4. **Post-deploy verification**:
   - Verify `/resources?page=999` returns HTTP 404.
   - Verify eSewa checkout redirects/submits to `https://epay.esewa.com.np`.
   - Verify cancellation at gateway marks transaction `CANCELLED`.