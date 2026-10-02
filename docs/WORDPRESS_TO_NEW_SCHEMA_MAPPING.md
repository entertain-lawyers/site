# WORDPRESS TO NEW SCHEMA MAPPING

This document proposes a mapping from the existing WordPress architecture to the new Prisma/Next.js architecture based on the read-only HTTP/REST discovery audit.

## 1. Study Resources

**WordPress Source:** `wp_posts` (post_type: 'post') filtered by Categories (e.g., "Case Law", "Notes", "Question Paper").
**New Prisma Model:** `Resource` -> `Document`

| WordPress Field / Concept | Prisma Model / Field | Transformation Required | Validation Required | Confidence |
|---|---|---|---|---|
| `post_title` | `Resource.title` | Direct string copy. | Non-empty | HIGH |
| `post_content` (Elementor) | `Resource.content` (RichText) | High. Must strip Elementor shortcodes and HTML wrappers. | Ensure no broken HTML. | MEDIUM |
| Category ID | `Resource.subjectId` | Map WP category (e.g. 113 - Case Law) to specific `Subject` ID. | Must match Prisma `Subject` UUID. | MEDIUM |
| Category ID | `Resource.type` | Derive Enum (`CASE_LAW`, `LAW_NOTE`, `OLD_QUESTION`) based on WP Parent Category. | Must match Enum type. | HIGH |
| Embedded FlipBook | `Document` Model | Extract PDF URL from shortcode. Create `Document` record. Link `Document.id` to `Resource.documentId`. | Ensure valid PDF URL. | MEDIUM |
| `post_date` | `Resource.createdAt` | Direct timestamp copy. | Valid Date. | HIGH |
| Author ID | `Resource.authorId` | Map WP user ID to new Prisma `User` UUID. | Fallback to System Admin if not found. | HIGH |

## 2. Blogs / News

**WordPress Source:** `wp_posts` (post_type: 'post') filtered by Categories ("Blog" - 61, "News" - 58).
**New Prisma Model:** `Post`

| WordPress Field / Concept | Prisma Model / Field | Transformation Required | Validation Required | Confidence |
|---|---|---|---|---|
| `post_title` | `Post.title` | Direct string copy. | Non-empty | HIGH |
| `post_content` | `Post.content` | Strip Elementor shortcodes. | Ensure no broken HTML. | MEDIUM |
| Category ID | `Post.type` | If Category=58 -> `NEWS`. If Category=61 -> `BLOG`. | Match Enum. | HIGH |
| `post_status` | `Post.status` | `publish` -> `PUBLISHED`, `draft` -> `DRAFT`. | Match Enum. | HIGH |
| Featured Media | `Post.featuredImage` | Extract `wp_postmeta` `_thumbnail_id`, resolve URL. Upload to Public R2. | Ensure valid image URL. | HIGH |
| `post_date` | `Post.createdAt` | Direct timestamp copy. | Valid Date. | HIGH |

## 3. Users

**WordPress Source:** `wp_users` / `wp_usermeta`
**New Prisma Model:** `User`

| WordPress Field / Concept | Prisma Model / Field | Transformation Required | Validation Required | Confidence |
|---|---|---|---|---|
| `user_email` | `User.email` | Direct string copy. | Unique email check. | HIGH |
| `display_name` | `User.name` | Direct string copy. | Non-empty | HIGH |
| Role Meta | `User.role` | Map `administrator` -> `ADMIN`, `editor` -> `EDITOR`, others -> `USER`. | Match Enum. | HIGH |
| `user_pass` | *DO NOT MIGRATE* | Reset required. Do not copy WP hashes. | N/A | HIGH |

## 4. Media

**WordPress Source:** `wp_posts` (post_type: 'attachment') / `wp-content/uploads/`
**New Prisma Model:** R2 Storage (Public / Private)

| WordPress Field / Concept | Target Storage | Transformation Required | Validation Required | Confidence |
|---|---|---|---|---|
| Image Attachments | Public R2 Bucket | Upload script. Map returned R2 URL to `Post.featuredImage`. | Valid MIME (JPEG/PNG/WEBP). | HIGH |
| PDF/DOC Attachments | Private R2 Bucket | Upload script. Map to `Document.url`. | Valid MIME (PDF). | HIGH |

## 5. Taxonomies

**WordPress Source:** `wp_terms`, `wp_term_taxonomy`
**New Prisma Model:** `Semester`, `Subject`, `Unit`

| WordPress Field / Concept | Prisma Model / Field | Transformation Required | Validation Required | Confidence |
|---|---|---|---|---|
| WP Category Name | `Subject.name` | Manual mapping matrix required. | N/A | LOW (Requires manual business logic mapping) |
| WP Category Parent | Hierarchy | WP "Case Law" -> Subject? Or Semester? | N/A | LOW (Requires manual mapping) |

*Note on Taxonomies:* The WordPress taxonomy does not use strict Semesters/Subjects in the way the Prisma schema does. Instead it uses generic Categories like "Criminal Law-I". These must be manually mapped to the correct Semester UUID and Subject UUID during the import script phase.

## 6. SEO Metadata

**WordPress Source:** Rank Math `wp_postmeta` entries.
**New Prisma Model:** Prisma SEO fields (if available) or standard Post metadata.

| WordPress Field / Concept | Prisma Model / Field | Transformation Required | Validation Required | Confidence |
|---|---|---|---|---|
| `rank_math_title` | `metaTitle` | Direct string copy. | String | UNKNOWN — REQUIRES SOURCE VERIFICATION |
| `rank_math_description` | `metaDescription` | Direct string copy. | String | UNKNOWN — REQUIRES SOURCE VERIFICATION |
