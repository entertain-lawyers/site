# WORDPRESS MIGRATION RISK ASSESSMENT

## 1. Elementor Content Conversion Risk
- **Risk:** High
- **Evidence:** 49+ posts in the English database rely on Elementor page builder markup.
- **Severity:** If not sanitized properly, the new Next.js Rich Text Editor will break or render massive blocks of unstyled JSON/HTML.
- **Mitigation:** Employ strict HTML sanitization (`sanitize-html` or `cheerio`). Only allow basic tags (`<p>`, `<h1>`, `<a>`, `<ul>`, `<li>`, `<strong>`). Discard all `div` wrappers containing `elementor` classes.

## 2. PDF Extraction & Missing Media
- **Risk:** High
- **Evidence:** Only 21 PDFs exist in the English uploads archive, yet there are significantly more Study Resource posts.
- **Severity:** Many Resources may end up without an attached Document.
- **Mitigation:** The migration script must log warnings for any Resource created without a valid PDF. Some PDFs might be hosted externally (e.g., Google Drive links embedded in post content), which requires a fallback strategy to preserve the external URL.

## 3. Taxonomy Ambiguity
- **Risk:** Medium
- **Evidence:** WP Categories like "Precedent" do not map 1:1 to a Prisma Enum. "Property Law" maps to a Subject, but its parent Semester is undefined in the WP database.
- **Severity:** Resources will be orphaned or categorized incorrectly in the new system.
- **Mitigation:** Force a manual review of a hardcoded mapping dictionary (`Category ID` -> `Semester UUID` + `Subject UUID`) before running the import script. (See Decisions Required document).

## 4. English / Nepali Cross-Linking
- **Risk:** Medium
- **Evidence:** The databases are physically separate without shared translation IDs.
- **Severity:** News articles that have both English and Nepali versions will not be correctly linked via a language toggle.
- **Mitigation:** Attempt to match based on identical post slugs (`/some-news-article`) and exact timestamp overlap. If no match is found, they remain independent articles.

## 5. SEO Preservation (Rank Math)
- **Risk:** Low/Medium
- **Evidence:** Rank Math stores SEO metadata in `wp_postmeta`.
- **Severity:** If meta titles/descriptions are dropped, Google rankings will tank.
- **Mitigation:** Identify Rank Math keys (e.g., `rank_math_title`, `rank_math_description`) in the `wp_postmeta` table and map them to the new `Post` and `Resource` metadata fields, or output them to a persistent metadata table. Create a comprehensive 301 redirect map for all migrated slugs.
