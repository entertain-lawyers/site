# TASK_CHECKLIST — Auth verification tightening

Branch: `feat/auth-verification-tightening` (from `origin/main` f962962)

## Part 1 — Forgot Password unregistered email
- [x] `requestPasswordReset`: unknown email → explicit `NO_ACCOUNT_MESSAGE` UserFacingError (no OTP, no token, no SMTP)
- [x] OAuth-only account (no `passwordHash`) → actionable Google sign-in message, no OTP
- [x] `ForgotPasswordClient`: error state with "Create an Account" (→ `/login?mode=register`) + "Try another email address"
- [x] `/login` opens register mode via `?mode=register`
- [x] Tests: explicit rejection, no SMTP/no token, OAuth-only case

## Part 2 — Mandatory email verification
- [x] Verification OTP TTL 15 min → 5 min
- [x] OTPs hashed in `VerificationToken` (bcrypt compare on verify; no plaintext storage)
- [x] `verifyEmail`: atomic single-use claim (`deleteMany` guarded by id+expiry) + guarded unverified→verified `updateMany`; plain Errors → `UserFacingError`
- [x] 60s resend cooldown via new `VerificationToken.createdAt` (+ migration `20261115000000`)
- [x] `registerSchema`: name + confirmPassword (refine match); User `name` saved
- [x] Registration UI: Full Name + Confirm Password fields (register mode)
- [x] Existing unverified accounts re-requesting registration still get a new code (recovery path); password reset for unverified account verifies it (pre-existing)
- [x] Unverified login block pre-existing in `auth.ts` authorize (ADMIN exempt) — unchanged
- [x] Branded `buildVerifyEmailEmail` (navy/gold, OTP once in HTML, preheader without OTP) wired into `sendVerificationOTP`
- [x] Tests: register lifecycle (unverified create, hashed 5-min OTP, re-issue), verify (correct/wrong/expired/reused/max attempts), resend cooldown, no-enumeration resend; mail template tests incl. distinctness from reset email

## Verification
- [x] Full vitest: 696 passed / 111 skipped (DB suites skip without TEST_DATABASE_URL), 0 failed
- [x] `npx tsc --noEmit` clean
- [x] ESLint: no new issues (remaining are pre-existing on main)
- [x] `npx prisma validate` + `prisma generate` clean
- [x] `npm run build` succeeds

## Remaining
- [ ] Push branch + open PR against `main` (do not merge)
- [ ] Deploy: run `prisma migrate deploy` against prod (adds `VerificationToken.createdAt`)
