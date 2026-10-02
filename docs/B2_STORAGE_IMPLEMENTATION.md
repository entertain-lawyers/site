# B2 Storage Implementation

This document details the transition from Cloudflare R2 to Backblaze B2 for the Entertain Lawyers platform.

## B2 Bucket Architecture
- **Provider:** Backblaze B2 (S3-compatible)
- **Bucket Name:** `entertain-lawyers-production`
- **Visibility:** **PRIVATE**
- **Region:** US East

## Private Bucket Rationale
The bucket is configured as private to enforce strict authorization for paid study materials (PDFs). Because B2 does not currently support prefix-level visibility (making one folder public and another private), all public media (such as blog images) must also be fetched from the private bucket using short-lived S3 presigned URLs.

## Public Media Flow (Internal 302 Route)
To serve public images securely without breaking existing Next.js `<Image>` optimizations, we implemented an internal proxy route:
`GET /api/media/[...key]`

When the frontend or Next.js Image optimizer requests `/api/media/editorial/cover.jpg`:
1. The route verifies the key against a strict **Prefix Allowlist**.
2. If allowed, it dynamically generates a 60-minute presigned GET URL via `@aws-sdk/client-s3`.
3. It responds with an HTTP 302 Redirect to the short-lived B2 URL.
4. It sets `Cache-Control: public, max-age=1800` to aggressively cache the redirect without outliving the signature.

### Public Prefix Allowlist
The route securely enforces that only the following prefixes can be accessed:
- `editorial/`
- `gallery/`
- `publications/`

## Private Document Flow
Private documents (e.g., `documents/study.pdf`) are explicitly **rejected (403 Forbidden)** by the `/api/media` route.
Access to private documents remains secured via the existing dedicated endpoints (`src/lib/b2.ts`) that enforce server-side authorization checks before generating unique, short-lived presigned GET URLs directly to the client.

## Environment Variables
Production storage requires the following variables:
- `B2_ENDPOINT` (e.g., `https://s3.us-east-005.backblazeb2.com`)
- `B2_ACCESS_KEY_ID` (Application Key ID)
- `B2_SECRET_ACCESS_KEY` (Application Key Secret)
- `B2_BUCKET_NAME` (e.g., `entertain-lawyers-production`)

## Local vs Production Storage
The `StorageAdapter` pattern safely isolates local development:
- `NODE_ENV=production` uses `B2StorageAdapter` (requires actual credentials).
- `NODE_ENV=development` uses `LocalStorageAdapter` (saves to the local filesystem).

## CSP Implications
To allow raw `<img>` tags to follow the 302 redirect from `/api/media` to the B2 S3 domain, the Content-Security-Policy (CSP) in `next.config.ts` was updated. It dynamically reads `B2_ENDPOINT` at build-time and injects the origin into the `img-src` directive.

## Migration Preparation
For Phase 7 Migration (Upload to B2):
- **Script Target:** The migration script should target the `entertain-lawyers-production` bucket via standard S3 PutObject commands.
- **Prefixes:** Original WordPress images must be categorized into `editorial/` or `gallery/` during the upload. PDFs must be pushed to `documents/`.
- **Idempotency:** B2 uploads should evaluate object size or Phase 6 SHA-256 hashes against existing objects to skip unnecessary re-uploads.

## Known Limitations
- The internal `/api/media` proxy consumes negligible Next.js compute time to generate signatures, but does introduce a minimal redirect hop for raw image tags.
- B2 credentials must never be committed to source control.
