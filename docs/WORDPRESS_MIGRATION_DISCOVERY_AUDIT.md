# WORDPRESS MIGRATION DISCOVERY AUDIT

## 1. Executive Summary
This document presents the findings of a read-only discovery audit performed on the existing WordPress site at `https://entertainlawyers.com`. The goal is to analyze the existing content, structure, and taxonomy to plan a safe migration into the new Next.js/Prisma architecture.

As no SQL dump, backup archive, or direct database credentials were provided or found locally, this audit was conducted strictly via the live WordPress REST API (`/wp-json/wp/v2/`) and HTTP inspection. Any data that requires direct database access has been marked as requiring source verification.

## 2. WordPress Environment
- **Host:** Babal.Host (based on instructions)
- **Domain:** `https://entertainlawyers.com`
- **WordPress Version:** UNKNOWN — REQUIRES SOURCE VERIFICATION (Headers suggest recent version given active REST API and Block Editor support).
- **Theme:** GeneratePress (`generatepress/v1` REST namespace detected).
- **Active Plugins Detected:**
  - Elementor & Elementor Pro
  - Rank Math SEO
  - 3D FlipBook (dflip-lite) - Used for PDF/Document rendering
  - Google Site Kit
  - LiteSpeed Cache
  - ShareThis Share Buttons
  - WP Content Copy Protector
  - Shortcode for Current Date

## 3. Database Inventory
**UNKNOWN — REQUIRES SOURCE VERIFICATION**
Direct inspection of `wp_posts`, `wp_postmeta`, `wp_users`, etc. is not possible without a database dump. Table counts and approximate row counts cannot be accurately derived beyond what the REST API exposes. No WooCommerce or LMS plugin tables are present, as the REST API and frontend footprints show no evidence of e-commerce/LMS systems.

## 4. Content-Type Inventory
The WordPress REST API exposes the following content types:

| Content Type | Source (WP REST) | Count | Should Migrate? | Notes |
|---|---|---|---|---|
| Posts | `post` | 326 | YES | Includes News, Blogs, and all Study Resources. |
| Pages | `page` | 29 | YES | Static pages, potential landing pages. |
| Attachments | `attachment` (Media) | 605 | YES | Images, PDFs, and documents. |
| Blocks/Templates | `wp_block`, `wp_template` | UNKNOWN | NO | Elementor/Gutenberg specific layout data. |

**Observation:** There are no custom post types (CPTs) registered for Study Resources. Case laws, notes, and question papers are managed as standard `post` entities.

## 5. Taxonomy Inventory
The site relies heavily on standard WordPress categories.
Total Categories: ~47

Key Taxonomy Categories:
- **Case Law** (ID 113) - Parent for subjects like Contract Law-I, Criminal Law-I, Company Law, etc.
- **Notes** (ID 121) - Parent for Notes on Criminal Law, Property Law, etc.
- **Precedent** (ID 79) - Parent for Civil, Criminal, Writs.
- **Question Paper** (ID 126)
- **News** (ID 58)
- **Blog** (ID 61)

## 6. Study Resource Inventory
Study resources are stored as standard WordPress `post` items assigned to specific educational categories (e.g., "Contract Law-I", "8th Semester Civil Moot Court Complete File").

- **Title/Content:** Stored as standard post title and `post_content`.
- **Category:** Defines the Subject/Resource Type.
- **Document URL:** Handled via embedded media (often rendered using the `3d-flipbook-dflip-lite` plugin).
- **Price/Free Status:** Currently all appear to be freely accessible standard posts. No membership/payment plugin was detected.
- **Access Restrictions:** `WP Content Copy Protector` is used, but this is a frontend JS restriction, not a true backend entitlement restriction.

*Confidence:* The hierarchical mapping to the new Prisma model (Semester -> Subject -> Unit -> Resource) is possible, but will require mapping specific WordPress Category IDs to Prisma `Subject` and `Resource` types manually.

## 7. Media/File Inventory
- **Total Attachments:** 605
- **Types:** Images (Featured Images for posts), PDFs, DOCX files.
- **Public/Private:** Currently, all media is publicly accessible in the `wp-content/uploads/` directory. No secure private document architecture is present.
- **Migration Plan:**
  - Images (featured images, editorial content) → **PUBLIC R2 MEDIA**
  - Study Documents (PDFs, Notes) → **PRIVATE R2 STUDY DOCUMENTS**

## 8. User Inventory
- **Total Users Exposed:** 15 (via `/wp-json/wp/v2/users`)
- **Roles:** UNKNOWN — REQUIRES SOURCE VERIFICATION. The REST API exposes users who have published content (likely Admins/Editors/Authors).
- **Migration Plan:** Safely migrate to Prisma `User` model. Passwords cannot be migrated safely if hashing algorithms differ (or if we prefer Auth.js defaults); a password reset / first-login flow is recommended for all existing users. Do not copy WP hashes.

## 9. Membership / Purchase / Payment Inventory
**UNKNOWN / NONE DETECTED**
There is no WooCommerce namespace (`/wc/v3`), no Restrict Content Pro, no MemberPress, or any LMS footprints. The site appears to currently provide content freely via standard posts. Thus, mapping to `Purchase`, `PaymentTransaction`, `Subscription`, or `Entitlement` is not applicable for existing data.

## 10. SEO Inventory
- **Plugin:** Rank Math SEO is active.
- **Metadata:** Page titles, meta descriptions, OpenGraph tags, and canonical URLs are managed by Rank Math.
- **Migration Plan:** Meta descriptions and titles should be extracted from `wp_postmeta` (Rank Math keys) during the database import phase and mapped to the new SEO fields.

## 11. URL / Permalink Inventory
- **Structure:** Posts appear to use `/%postname%/` slug structures (e.g., `https://www.entertainlawyers.com/gender-and-inclusive-justice-case...`).
- **Redirects:** A comprehensive 301 redirect map must be built to redirect old `https://entertainlawyers.com/<slug>` URLs to the new architecture (`/news/<slug>`, `/study/...`, etc.).

## 12. Content Builder Analysis
- **Builders Used:** Elementor, Elementor Pro, Gutenberg (Block Editor).
- **Complexity:** HIGH. Migrating raw `post_content` directly into a standard RichTextEditor is risky because it contains Elementor shortcodes, layout blocks, and 3D FlipBook shortcodes.
- **Recommendation:** HTML content must be parsed, stripped of Elementor wrappers, and converted to clean HTML or plain text where applicable. Embedded PDFs (flipbooks) must be extracted and migrated to `Document` relations.

## 13. Data Quality Findings
- **Embedded Documents:** Documents are embedded using shortcodes. These must be manually or programmatically extracted.
- **Mixed Content:** The `post` type is heavily overloaded. News, Blogs, and Study Resources all share the same table and post type, differentiated only by category.

## 14. Proposed WordPress → New Schema Mapping
*(See docs/WORDPRESS_TO_NEW_SCHEMA_MAPPING.md for detailed matrix)*

## 15. Migration Complexity Matrix
| Dataset | Complexity | Reason |
|---|---|---|
| Users | LOW | Only 15 users. Easy to import; force password resets. |
| Taxonomies | MEDIUM | WP Categories must be manually mapped to Semesters/Subjects/Resource Types. |
| Blogs/News | MEDIUM | Requires cleaning Elementor markup. |
| Study Resources | HIGH | Overloaded as standard posts. Embedded FlipBook shortcodes must be converted into secure `Document` relations. |
| Media | HIGH | Public images and private study documents are mixed in `wp-content/uploads`. |
| Memberships | N/A | No existing payment data detected. |

## 16. Items Requiring Manual Review
1. **WP Category to Semester/Subject Mapping:** Must be done manually as WP categories do not have a strict Semester -> Subject -> Unit hierarchy.
2. **Elementor Content:** Reviewing how badly Elementor shortcodes pollute the study resource text.
3. **Database Access:** A raw `.sql` dump must be provided by the client to proceed with script development.

## 17. Recommended Migration Phases
1. **Acquisition:** Obtain raw `.sql` dump and `wp-content/uploads` zip from Babal.Host.
2. **Cleansing:** Script to parse `wp_posts`, strip Elementor code, and extract PDF URLs.
3. **Categorization:** Map WP Categories to Prisma Enums/Relations.
4. **Media Upload:** Upload public images to Public R2; upload study PDFs to Private R2.
5. **Data Import:** Seed PostgreSQL database.

## 18. Risks
- Elementor shortcodes failing to parse, resulting in broken content in the new Rich Text editor.
- Misidentifying a Study Resource as a Blog Post due to overlapping categories.

## 19. Unknowns
- Exact table structures, postmeta keys, and row counts (Requires DB Dump).
- Exact Rank Math SEO metadata keys.

## 20. Exact Next Steps
1. Request a full `.sql` database export and a `.zip` of `wp-content/uploads` from the client.
2. Once received, develop the NodeJS/Prisma migration script based on the mapping document.
