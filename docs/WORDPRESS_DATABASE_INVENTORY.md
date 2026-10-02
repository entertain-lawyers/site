# WORDPRESS DATABASE INVENTORY

## 1. Overview
Two separate SQL dumps were provided and evaluated.

### English Installation (Root Site)
- **Database Name:** `entertai_wp576`
- **Table Prefix:** `wpfn_`
- **Total Tables:** 61
- **File Size:** ~50MB (Uncompressed)

### Nepali Installation (Subdirectory Site)
- **Database Name:** `entertai_wp51`
- **Table Prefix:** `wp0o_`
- **Total Tables:** 55
- **File Size:** ~26MB (Uncompressed)

## 2. Table Analysis (English - wpfn_)
| Table Name | Approx. Rows | Notes |
|---|---|---|
| `wpfn_posts` | 310+ | Core table. Contains posts, pages, attachments, revisions, elementor docs. |
| `wpfn_postmeta` | 884+ | Core table. Contains Elementor JSON payloads, Rank Math SEO keys. |
| `wpfn_users` | 1 | Exposed user list count. (API indicated 15, likely mapping to multiple authors/meta). |
| `wpfn_usermeta` | 2+ | User capabilities and session keys. |
| `wpfn_terms` | ~47 | Core taxonomy terms (categories/tags). |
| `wpfn_term_taxonomy` | ~47 | Links terms to taxonomy types (`category`, `post_tag`). |
| `wpfn_term_relationships` | - | Relates posts to terms. |
| `wpfn_options` | 24+ (inserts) | Core settings (`siteurl`, `home`, `blogname`). |
| `wpfn_rank_math_*` | Multiple | 7 tables storing SEO analytics, redirects, internal links. |
| `wpfn_e_submissions*` | Multiple | Elementor Pro Forms submission data. |
| `wpfn_aioseo_*` | Multiple | Leftover tables from All in One SEO (inactive/migrated to Rank Math). |
| `wpfn_wpreactions_*` | Multiple | Plugin tables for emoji reactions on posts. |

## 3. Table Analysis (Nepali - wp0o_)
| Table Name | Approx. Rows | Notes |
|---|---|---|
| `wp0o_posts` | 78+ | Contains Nepali translated posts and pages. |
| `wp0o_postmeta` | 546+ | Elementor JSON and SEO keys for Nepali. |
| `wp0o_users` | 1 | Shared user structure (potentially synced manually). |
| `wp0o_terms` | ~26 | Fewer categories, matching the smaller content scope. |

## 4. Notable Absences
- No WooCommerce tables (`wp_woocommerce_*`).
- No LMS tables (LearnDash, TutorLMS, etc.).
- No explicit Membership or Payment tables.

This confirms the database solely serves as an editorial CMS where educational "Resources" are standard WordPress posts managed by categories and Elementor.
