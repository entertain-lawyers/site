# WORDPRESS MIGRATION DECISIONS REQUIRED

The following items represent ambiguities discovered during the forensic audit that cannot be resolved programmatically. They require human/business decisions before the migration script can be finalized.

## 1. Semester & Subject Mapping
The WordPress database stores subjects like "Criminal Law-I" as flat categories (e.g. Category ID 115).
The new Prisma database requires both a `Subject` UUID and a parent `Semester` UUID.
**Decision Required:** Please provide a definitive mapping spreadsheet or JSON dictionary linking:
`WordPress Category Name` -> `New Semester Name` -> `New Subject Name`.

## 2. Ambiguous Resource Types
The WordPress category "Precedent" (ID 79) contains items under "Civil", "Criminal", and "Writs".
**Decision Required:** Should these be classified under the new Prisma ResourceType `CASE_LAW`, `LAW_NOTE`, or `OTHER`?

## 3. Empty Documents / Missing PDFs
Only 21 PDFs were found in the English uploads directory, but there are over 100+ study resources.
**Decision Required:** For a study resource that has no embedded PDF (e.g., text only or external Google Drive link), should the migration script:
A. Migrate it as a `Resource` anyway, leaving `documentId` null/empty?
B. Migrate it as a standard `Post` (Blog) instead of a `Resource`?

## 4. English / Nepali Cross-Linking
Because the English and Nepali sites are separate databases, we cannot guarantee which Nepali news post corresponds to which English news post.
**Decision Required:** Should the migration script attempt to aggressively link posts with identical slugs across the two databases, or should they all be migrated as independent `Post` records (meaning language-toggling on a single article will not be natively supported immediately)?

## 5. Extraneous Pages
There are ~30 static pages (e.g., About Us, Privacy Policy).
**Decision Required:** Do you want these migrated into a new Markdown-based Prisma `Page` model (which does not currently exist), or should they be excluded from the database migration and manually rebuilt as React components in the Next.js `app/` directory?
