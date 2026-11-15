# Production-Ready Email OTP Forgot Password Implementation Checklist

## Phase 1 — Architecture Audit & Security Review
- [x] Inspect existing authentication, registration, hashing, and session management (`auth.ts`, `auth.config.ts`, `auth.actions.ts`)
- [x] Inspect existing Prisma schema (`User`, `VerificationToken`, `Session`)
- [x] Inspect email service abstraction and templates (`src/lib/mail.ts`)
- [x] Verify routing, proxy rules, and redirect exemptions (`src/proxy.ts`, `src/lib/redirect-rules.ts`)

## Phase 2 — Database Architecture & Migration
- [ ] Add `PasswordResetToken` model to `prisma/schema.prisma` with:
  - `userId` (relation to `User` with Cascade delete)
  - `hashedOtp` (securely hashed OTP)
  - `token` (single-use secure reset token for password update, unique & indexed)
  - `expiresAt` (5-minute TTL for OTP)
  - `resendAvailableAt` (60-second cooldown timestamp)
  - `attempts` (attempt counter, max 5)
  - `verifiedAt` (timestamp when OTP verified)
  - `consumedAt` (timestamp when password reset completed)
  - `createdAt` & `updatedAt` timestamps
- [ ] Create and apply Prisma migration `20261114220000_add_password_reset_otp`
- [ ] Run `prisma generate` to update Prisma Client types

## Phase 3 — Backend Actions & Security Protections
- [ ] Implement `requestPasswordResetOtp({ email })`:
  - Input validation with Zod
  - Email normalization
  - Generic success response for non-existent users (anti-enumeration)
  - 60-second resend cooldown check
  - Invalidate any previous unconsumed reset tokens
  - Generate cryptographically secure 6-digit OTP using `crypto.randomInt`
  - Hash OTP using bcrypt
  - Store token in database with 5-minute expiry
  - Send branded email with OTP
  - Request rate limiting per IP and per account
- [ ] Implement `verifyPasswordResetOtp({ email, otp })`:
  - Input validation with Zod (email, 6-digit string)
  - Rate limiting & brute-force prevention
  - Check expiration (5 min)
  - Check attempt counter (max 5); increment on failure; invalidate on reaching 5
  - Constant-time comparison using bcrypt
  - Single-use consumption of OTP
  - Generate high-entropy 32-byte `resetToken` for password reset phase
  - Transaction safety
- [ ] Implement `resetPasswordWithToken({ email, token, newPassword, confirmPassword })`:
  - Input validation with Zod (min 8 chars, matching passwords, 64-char hex token)
  - Verify `resetToken` is valid, unconsumed, and not expired
  - Hash new password with bcrypt (12 salt rounds)
  - Transaction-safe atomic update: update password, invalidate reset token, set `isEmailVerified: true`
  - Invalidate existing user sessions (`sessionVersion: { increment: 1 }`)
- [ ] Polish branded email template in `src/lib/mail.ts`:
  - Entertain Lawyers branding, clean HTML styling
  - Clearly visible 6-digit OTP
  - 5-minute expiration notice
  - Security warning for unprompted resets

## Phase 4 — UI Implementation
- [ ] Build `/forgot-password`: Enter email, submit to get OTP, validation, generic success
- [ ] Build `/forgot-password/verify`: 6-digit OTP entry, paste support, 60s cooldown timer, attempt feedback
- [ ] Build `/reset-password`: New password + confirm password, show/hide toggle, validation
- [ ] Build Success Confirmation screen: clean confirmation with link & auto-redirect to `/login`
- [ ] Ensure full mobile responsiveness, accessibility, dark mode consistency, and adherence to Entertain Lawyers styling

## Phase 5 — Comprehensive Testing & Verification
- [ ] Unit & integration tests for all security requirements:
  - Successful OTP generation & delivery
  - Invalid OTP rejection & attempt counter increment
  - Maximum verification attempts lockout (5 attempts)
  - Expired OTP rejection (5 minutes)
  - Single-use replay attack prevention
  - 60-second cooldown enforcement
  - Rate limiting on reset requests
  - Anti-enumeration generic responses
  - Successful password update & session invalidation (`sessionVersion`)
  - Password mismatch validation
  - Invalidation of previous tokens
- [ ] TypeScript checks (`npx tsc --noEmit`)
- [ ] Full Vitest suite (`npx vitest run`)
- [ ] Production build (`npm run build`)
- [ ] End-to-end browser verification

## Phase 6 — Documentation & Final Report
- [ ] Document all created/modified files, migrations, env vars, and security features in final report
