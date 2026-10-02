# INFRASTRUCTURE OWNERSHIP AUDIT

## 1. Current Infrastructure
The codebase currently relies on local dummy configuration values and points to localhost resources. There is no evidence of linked production infrastructure in the repository's configuration.

## 2. Current Providers
Based on `.env` and application architecture, the intended providers are:
- **Database**: PostgreSQL (currently locally hosted)
- **Object Storage**: Cloudflare R2 (currently using dummy sandbox credentials)
- **Authentication**: Auth.js (using local dummy secret)
- **Payments**: eSewa & Khalti (sandbox/dummy keys)
- **Rate Limiting**: Upstash Redis (dummy endpoint)

## 3. Current Environment Classification
The current `.env` configuration strictly reflects a **Development** environment.
- `DATABASE_URL` connects to `localhost:5432`.
- Production credentials for R2, Upstash, eSewa, and Khalti are all hardcoded to `"dummy"`.

## 4. Current Database Status
- **Provider**: PostgreSQL
- **Host**: `localhost:5432`
- **Database Name**: `entertain_lawyers`
- **Migration Status**: Up-to-date (11 migrations applied).
- **Connection Status**: Successfully connected. Contains local Batch 1/2 test data.
- **Externally Hosted**: No (Local only).

## 5. Current R2/Storage Status
- **Cloudflare R2**: Configured in architecture, but using dummy credentials in `.env`.
- **Bucket**: Defined in `.env` as `"dummy"` (and previously `"entertain-lawyers-staging"`).
- **Access Scope**: Current credentials appear to be local placeholders only.
- **Privacy**: The existing document architecture assumes a private bucket accessed only via presigned URLs.

## 6. Current Deployment Status
- **Provider**: Undefined locally (no Vercel config, `.vercel` directory, or external CI/CD observed).
- **Domain**: `NEXT_PUBLIC_APP_URL` is set to `https://www.entertainlawyers.com`, but there is no linked cloud hosting configuration.
- **Deployed**: The application is not yet deployed from this environment.

## 7. Required Batch 3 Infrastructure
- A dedicated **Public Cloudflare R2 Bucket** exclusively for editorial media (e.g. `entertain-lawyers-public-media`).
- A **Public Domain / Subdomain** mapped to the new R2 bucket (e.g. `media.entertainlawyer.com` or Cloudflare's `.r2.dev` assigned domain).

## 8. New Environment Variables Required
```env
# Batch 3 Requirements (to be configured in production/staging environments):
R2_PUBLIC_BUCKET_NAME → pending
NEXT_PUBLIC_R2_PUBLIC_DOMAIN → pending
```
Existing configured (dummy) environment variables:
- `DATABASE_URL` → configured
- `AUTH_SECRET` → configured
- `NEXT_PUBLIC_APP_URL` → configured
- `R2_ACCOUNT_ID` → configured
- `R2_ACCESS_KEY_ID` → configured
- `R2_SECRET_ACCESS_KEY` → configured
- `R2_BUCKET_NAME` → configured
- `ESEWA_MERCHANT_ID` → configured
- `ESEWA_SUCCESS_URL` → configured
- `ESEWA_FAILURE_URL` → configured
- `KHALTI_PUBLIC_KEY` → configured
- `KHALTI_SECRET_KEY` → configured
- `UPSTASH_REDIS_REST_URL` → configured
- `UPSTASH_REDIS_REST_TOKEN` → configured

## 9. Which resources should ultimately be owned by the client
ALL production infrastructure must be owned by the client (Entertain Lawyers), including:
- Cloudflare Account (DNS, R2 Buckets)
- Vercel or primary Hosting Account
- Database Provider Account (e.g. Neon.tech, Supabase, or AWS RDS)
- Payment Gateway Accounts (Khalti & eSewa)
- Upstash Redis Account

## 10. What must wait for the official Entertain Lawyers organization email
- Creation of the production Cloudflare account and R2 buckets (including the Batch 3 public bucket).
- Creation of the production PostgreSQL database.
- Registration of the Vercel/Hosting project.
- Generation of the production `AUTH_SECRET`.
- Generation of the production Upstash Redis token.

## 11. Recommended ownership transfer procedure
Since no production infrastructure has been created under personal accounts yet, an ownership transfer is not strictly necessary. Instead, the recommended procedure is:
1. Wait for the client to provide a dedicated organizational email (e.g. `admin@entertainlawyer.com`).
2. Use this email to register for Cloudflare, Neon (or chosen DB host), Vercel, and Upstash.
3. The client retains ownership of the master email and passwords.
4. The client adds you (the developer) as an Administrator/Collaborator on these platforms via your personal/developer email.
5. Generate API keys from the client-owned accounts and plug them into the secure hosting environment.
