import { z } from "zod";

export const envSchema = z.object({
  // Required Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

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

  // Backblaze B2
  B2_ENDPOINT: z.string().url().optional(),
  B2_ACCESS_KEY_ID: z.string().optional(),
  B2_SECRET_ACCESS_KEY: z.string().optional(),
  B2_BUCKET_NAME: z.string().optional(),

  // Upstash Redis (For Rate Limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Payments Flag
  PAYMENTS_ENABLED: z.enum(["true", "false"]).default("true"),
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
    if (!data.DIRECT_URL) return false;
    if (!data.B2_ENDPOINT || !data.B2_ACCESS_KEY_ID || !data.B2_SECRET_ACCESS_KEY || !data.B2_BUCKET_NAME) return false;
    if (!data.UPSTASH_REDIS_REST_URL || !data.UPSTASH_REDIS_REST_TOKEN) return false;
  }
  
  if (data.NODE_ENV === 'production' && data.PAYMENTS_ENABLED === 'true') {
    if (!data.KHALTI_SECRET_KEY || !data.KHALTI_PUBLIC_KEY) return false;
    if (!data.ESEWA_MERCHANT_ID || !data.ESEWA_SECRET_KEY || !data.ESEWA_SUCCESS_URL || !data.ESEWA_FAILURE_URL) return false;
  }
  return true;
}, {
  message: "Production environment requires DIRECT_URL, B2, and Upstash. If PAYMENTS_ENABLED is true, Khalti and eSewa (including ESEWA_SECRET_KEY) must be fully configured.",
});

// For Next.js to properly evaluate NEXT_PUBLIC_ variables during build, they must be explicitly provided.
const _env = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : undefined),
  NODE_ENV: process.env.NODE_ENV,
  ESEWA_MERCHANT_ID: process.env.ESEWA_MERCHANT_ID,
  ESEWA_SECRET_KEY: process.env.ESEWA_SECRET_KEY,
  ESEWA_SUCCESS_URL: process.env.ESEWA_SUCCESS_URL,
  ESEWA_FAILURE_URL: process.env.ESEWA_FAILURE_URL,
  KHALTI_PUBLIC_KEY: process.env.KHALTI_PUBLIC_KEY,
  KHALTI_SECRET_KEY: process.env.KHALTI_SECRET_KEY,
  B2_ENDPOINT: process.env.B2_ENDPOINT,
  B2_ACCESS_KEY_ID: process.env.B2_ACCESS_KEY_ID,
  B2_SECRET_ACCESS_KEY: process.env.B2_SECRET_ACCESS_KEY,
  B2_BUCKET_NAME: process.env.B2_BUCKET_NAME,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED || 'true',
});

let finalEnv: z.infer<typeof envSchema>;

if (!_env.success) {
  if (process.env.SKIP_ENV_VALIDATION === '1' || process.env.SKIP_ENV_VALIDATION === 'true') {
    console.warn("⚠️ Skipping environment validation due to SKIP_ENV_VALIDATION flag.");
    finalEnv = new Proxy({}, { get: () => 'mock-value' }) as z.infer<typeof envSchema>;
  } else {
    console.error(
      "❌ Invalid environment variables:",
      JSON.stringify(_env.error.format(), null, 4)
    );
    throw new Error("Invalid environment variables");
  }
} else {
  finalEnv = _env.data;
}

export const env = finalEnv;
