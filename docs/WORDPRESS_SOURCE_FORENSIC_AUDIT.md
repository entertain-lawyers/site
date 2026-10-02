# WORDPRESS SOURCE FORENSIC AUDIT (PHASE 2)

## 1. Executive Summary
A strictly read-only forensic analysis was performed on the acquired WordPress migration archives for the `entertainlawyers.com` platform.

The archives were safely extracted to a temporary local analysis directory (`/tmp/wp-audit-tmp/`) without altering the source repository. Analysis was performed against the extracted SQL text dumps and media archives.

**No changes were made to the new application, the Prisma schema, the PostgreSQL database, or the live WordPress environment.**

## 2. Exact Source Files Analyzed & SHA-256 Checksums
- `wordpress-migration-source/english/entertainlawyers-english.sql.gz`
  SHA-256: `e2315ce6f85ed46b63623ae05ea86bd966d84e28485a3701f6468fd8a276c868`
- `wordpress-migration-source/english/entertainlawyers-english-uploads.zip`
  SHA-256: `db5b7a5eba050adc09e5db988d2cd638fb7c26a22021a18e4d00a1d07cf707c3`
- `wordpress-migration-source/nepali/entertainlawyers-nepali.sql.gz`
  SHA-256: `88f7cc72462671e29ffafdeaedabc49119b46f877616dc5f01269c8833b219c0`
- `wordpress-migration-source/nepali/entertainlawyers-nepali-uploads.zip`
  SHA-256: `16f89293b5e984c572f324b69ca5189734e1c587f1c79bd1d4a1a34109aa96c7`

## 3. Database Identities & English/Nepali Determination
Analysis of internal SQL dump URLs confirms the mapping:
- **English Database** (`entertai_wp576`): Operates the root domain `https://entertainlawyers.com/`. Prefix: `wpfn_`. Uncompressed size: ~50MB.
- **Nepali Database** (`entertai_wp51`): Operates the subdirectory `https://entertainlawyers.com/nepali/`. Prefix: `wp0o_`. Uncompressed size: ~26MB.

These are **two completely separate WordPress installations**, sharing the same host but operating independent databases and media directories.

## 4. Current Prisma Compatibility & Next Phase
The forensic audit verifies that the new Prisma architecture (`Semester`, `Subject`, `Unit`, `Resource`, `Document`, `Post`) is conceptually fully capable of storing the extracted WordPress data.
However, **significant transformation logic** will be required because the source data severely overloads the `post` type (storing articles, news, and case laws identically) and relies entirely on a flat/hierarchical category structure rather than strict tables.

**Recommended Next Phase:** Proceed to Phase 3 Implementation (Migration Scripting) leveraging the planned dataset pipeline.
