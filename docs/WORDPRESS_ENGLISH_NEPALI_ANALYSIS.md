# WORDPRESS ENGLISH/NEPALI ANALYSIS

## 1. Identity & URLs
- **English Database:** `entertai_wp576` (Prefix: `wpfn_`). Configured with `siteurl` and `home` as `https://entertainlawyers.com/`.
- **Nepali Database:** `entertai_wp51` (Prefix: `wp0o_`). Configured with `siteurl` and `home` as `https://entertainlawyers.com/nepali/`.

## 2. Infrastructure Setup
The databases and uploaded directories confirm that the English and Nepali sites are **completely separate WordPress installations**, not a single WordPress instance utilizing a multilingual plugin (like WPML or Polylang).
- They have distinct `wp_options` tables.
- They have distinct `wp-content/uploads/` physical directories.

## 3. Content Overlap & Relationship
- **English Site Content:** 310+ posts. Contains the authoritative source for Study Resources (Case Laws, Notes, Question Papers) as evidenced by the 21 PDFs in the uploads directory and 47 categories.
- **Nepali Site Content:** 78+ posts. Contains a smaller subset of categories (26) and 0 PDF files.

**Conclusion:** The Nepali installation is primarily used to translate News and Blog articles. Study Resources are not duplicated in the Nepali database. Any Nepali links to PDFs likely cross-link to the English domain's upload folder.

## 4. Migration Implication
Because they are distinct databases without explicit database-level relationships (e.g. `wpml_translations`), it is **impossible to programmatically link an English post to its Nepali equivalent** based purely on foreign keys.

To link translations in the new Next.js system, the migration script will need to rely on heuristics:
1. Matching slugs (e.g., `/news/some-slug` and `/nepali/news/some-slug`).
2. Matching exact timestamps.
3. Requiring human review for unmatched orphans.
