-- Count wrong OTP guesses so a six-digit verification/reset code cannot be
-- brute-forced by distributing requests across many IPs.
ALTER TABLE "VerificationToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
