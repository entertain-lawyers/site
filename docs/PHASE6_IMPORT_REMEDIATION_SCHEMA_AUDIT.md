# PHASE 6 SCHEMA AUDIT

**Database Source:** Authoritative Neon Production Database (`prisma db pull`)

## Post Model Fields
- `id` (String, `@id @default(uuid())`)
- `title` (String)
- `content` (String, Text)
- `type` (`PostType` enum)
- `authorId` (String?)
- `createdAt` (DateTime, default `now()`)
- `updatedAt` (DateTime)
- `status` (`ContentStatus` enum, default `DRAFT`)
- `metaDesc` (String?)
- `metaTitle` (String?)
- `author` (User?)
- `Category` (Category[])
- `Tag` (Tag[])

## Resource Model Fields
- `id` (String, `@id @default(uuid())`)
- `title` (String)
- `isPremium` (Boolean, default `false`)
- `subjectId` (String)
- `documentId` (String?)
- `currency` (String, default `NPR`)
- `priceAmount` (Int?)
- `order` (Int?, default `0`)
- `type` (`ResourceType` enum, default `LAW_NOTE`)
- `unitId` (String?)
- `metaDesc` (String?)
- `metaTitle` (String?)
- `status` (`ContentStatus` enum, default `PUBLISHED`)
- (Relations to Subject, Unit, Document, AccessLogs, Entitlements, Purchases, UploadIntents, Category, Tag)

## Available SEO Metadata Fields
The authoritative schema **does** contain `metaTitle` and `metaDesc` on both `Post` and `Resource` models. The previous read-only local schema inspection was looking at an out-of-sync local file, which lacked these fields. The Neon database explicitly defines them.

## Source/External ID Fields
There is NO explicit `sourceId`, `wordpressId`, or `legacyId` field in either `Post` or `Resource`. The only textual field that could theoretically store a source ID is `metaTitle` (which the stale importer previously attempted to overload). However, overloading SEO metadata fields for structural identity is brittle.

## Current Primary Keys and Unique Constraints
- **Primary Keys:** Both use `id String @id @default(uuid())`
- **Unique Constraints:** `Resource` has `documentId` marked as `@unique`. There are no unique constraints on `title`, `metaTitle`, or any other content field, meaning deduplication via standard DB constraint is impossible without an external identifier.

## Subject/Unit/Semester Relationships
- **Semester:** `id`, `name`, `order`
- **Subject:** `id`, `name`, `semesterId`
- **Unit:** `id`, `name`, `title`, `order`, `subjectId`
- `Resource.subjectId` is NOT NULL (must reference a valid Subject unless a schema change allows nulls, or a fallback "Null Subject" record is inserted).
- `Resource.unitId` is nullable.

## Redirect Model Fields
The Prisma schema does **NOT** contain a `Redirect` model. Redirects are handled purely via a static/JSON artifact (e.g. Next.js `next.config.js` or middleware reading from `redirects.json`).

## Document Model Fields
- `id` (String, `@id @default(uuid())`)
- `storageProvider` (String)
- `storageKey` (String)
- `fileSize` (Int)
- `mimeType` (String)
- (Relations to Resource, AccessLog)
