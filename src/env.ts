import { z } from "zod";

const envSchema = z.object({
  // Required Database
  DATABASE_URL: z.string().url(),

  // Required Auth.js
  AUTH_SECRET: z.string().min(32),

  // Application URL (Critical for Payment Callbacks)
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Development/Staging Variables
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // eSewa
  ESEWA_MERCHANT_ID: z.string().optional(),
  ESEWA_SECRET_KEY: z.string().optional(),
  ESEWA_SUCCESS_URL: z.string().url().optional(),
  ESEWA_FAILURE_URL: z.string().url().optional(),

  // Khalti
  KHALTI_PUBLIC_KEY: z.string().optional(),
  KHALTI_SECRET_KEY: z.string().optional(),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),

  // Upstash Redis (For Rate Limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
}).refine(data => {
  if (data.NODE_ENV === 'production') {
    if (data.NEXT_PUBLIC_APP_URL.includes('localhost')) return false;
  }
  return true;
}, {
  message: "NEXT_PUBLIC_APP_URL must be a valid production URL, not localhost.",
  path: ["NEXT_PUBLIC_APP_URL"]
}).refine(data => {
  if (data.NODE_ENV === 'production') {
    if (!data.R2_ACCOUNT_ID || !data.R2_ACCESS_KEY_ID || !data.R2_SECRET_ACCESS_KEY || !data.R2_BUCKET_NAME) return false;
    if (!data.UPSTASH_REDIS_REST_URL || !data.UPSTASH_REDIS_REST_TOKEN) return false;
    if (!data.KHALTI_SECRET_KEY || !data.KHALTI_PUBLIC_KEY) return false;
    if (!data.ESEWA_MERCHANT_ID || !data.ESEWA_SUCCESS_URL || !data.ESEWA_FAILURE_URL) return false;
  }
  return true;
}, {
  message: "Production environment requires all third-party API keys (R2, Upstash, Khalti, eSewa) to be securely configured.",
});

// For Next.js to properly evaluate NEXT_PUBLIC_ variables during build, they must be explicitly provided.
const _env = envSchema.safeParse({
  ...process.env,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : undefined),
});

if (!_env.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(_env.error.format(), null, 4)
  );
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
