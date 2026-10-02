
# WORDPRESS MIGRATION POLICY — FINAL (PHASE 3)

## 1. Executive Summary
This policy dictates the strict rules for migrating content from the Babal.Host WordPress SQL dump into the new Entertain Lawyers PostgreSQL/Prisma target schema. It establishes the Source of Truth, resolves structural conflicts, defines target models for various content classes, and establishes a robust Human Review queue for edge cases. **No data is modified during this phase.**

## 2. Source of Truth Hierarchy
1. **Prisma Schema:** Authoritative for target models, relationships, and data shape.
2. **WordPress SQL Dump:** Authoritative for source content, IDs, timestamps, and taxonomy mapping.
3. **Live Website (read-only):** Provided zero context for study architecture; thus, the database hierarchy is the absolute source of truth for categories.

## 3. Content Classification Rules
All WordPress `post` types map to specific Prisma models based on their category:
- **News** → `Post` (Type: `NEWS`)
- **Blog / Opinion** → `Post` (Type: `BLOG`)
- **Historical Fact** → `Post` (Type: `FACT`)
- **Study Content (Case Law, Notes, Questions)** → `Resource`

## 4. ResourceType Rules
When a WordPress post belongs to a Study category, its ResourceType is assigned as follows:
- **Case Law / Precedent** → `ResourceType.CASE_LAW`
- **Notes** → `ResourceType.LAW_NOTE`
- **Question Paper** → `ResourceType.OLD_QUESTION`
- **Unclassified Study** → `ResourceType.OTHER`

## 5. Semester/Subject Mapping
The following verified subjects map automatically to Prisma:
- **Criminal Law-I** → 3rd Semester / Criminal Law-I
- **Criminal Law-II** → 4th Semester / Criminal Law-II
- **Contract Law-I** → 3rd Semester / Law of Contract-I
- **Contract Law-II** → 4th Semester / Law of Contract-II
- **Company Law and Governance** → 5th Semester / Company Law
- **Environmental Law** → 6th Semester / Environmental Law
- **Evidence Law** → 5th Semester / Law of Evidence
- **Intellectual Property Law** → 7th Semester / Intellectual Property Law
- **Labour Law** → 5th Semester / Labor Law
- **Law of Banking and Negotiable Instruments** → 7th Semester / Banking and Insurance Law
- **Property Law** → 4th Semester / Property Law
- **Taxation Law** → 6th Semester / Taxation Law

## 6. Precedent Handling
The WordPress Precedent hierarchy (Civil, Criminal, Writs) represents broad groupings, not specific syllabus subjects.
- **Rule:** `ResourceType = CASE_LAW`, `subjectId = NULL`.
- **Review:** Leave unassigned to a subject unless the individual case explicitly names its syllabus subject. Do NOT map to Civil Procedure or Criminal Procedure automatically.

## 7. Family Law Handling
- **Rule:** `ResourceType = CASE_LAW`, `subjectId = NULL`.
- **Reason:** WordPress provides no distinction between Family Law-I and Family Law-II.
- **Queue:** Requires `HUMAN_REVIEW` per resource.

## 8. Missing Subject Handling
The following categories do not exist in the Prisma 1st-10th Semester schema:
- Criminology and Penology
- Election Law
- Fiscal Law
- Gender and Inclusive Justice
- Interpretation of Law
- Juvenile Delinquency
- Socio Economic Crime

- **Rule:** Do NOT invent subjects. Do NOT map to generic Electives.
- **Handling:** `subjectId = NULL`.
- **Queue:** `HUMAN_REVIEW`. The business must decide whether to create these as new Subjects in Prisma or tag them under Electives manually.

## 9. Corporate Law Decision
- **Evidence:** WP Category 149 (Corporate Law and Management) contains 17 posts. One post explicitly mentions "6th semester". Prisma has "Company Law" in the 5th semester, and no Corporate Law in the 6th.
- **Rule:** `HUMAN_DECISION_REQUIRED`.
- **Handling:** Do NOT map to Company Law automatically. Leave `subjectId = NULL`.

## 10. Elective Policy
- **Rule:** Elective-I, II, III, and IV must **never** be used as generic fallback buckets. Content is only mapped to an Elective if the WordPress source explicitly indicates the content belongs to that Elective slot. Otherwise, it defaults to `subjectId = NULL`.

## 11. Posts vs Resources
- **News / Blogs / Opinions / Legal Facts:** Mapped to the Prisma `Post` model.
- **Case Laws / Notes / Questions / Precedents / Academic Topics:** Mapped to the Prisma `Resource` model.
- **Nepali Content:** Mapped to `Post` with specific Nepali enums (`NEPALI_SAMANYA_SAMACHAR`, etc.).

## 12. WordPress Pages
- **Rule:** WordPress Pages (`post_type = 'page'`) will **not** be migrated to PostgreSQL.
- **Handling:** Static pages (Home, About, Contact) will be rebuilt natively as Next.js React components. Dynamic configurations (like Homepage hero banners) will be seeded directly into the `GlobalSettings` and `HomepageConfig` Prisma models if applicable.

## 13. Elementor
- **Rule:** Do NOT perform a blind React conversion of Elementor JSON/shortcodes.
- **Handling:** Run an HTML sanitization pass (`dompurify` or `cheerio`) to strip `elementor-section` wrappers. Extract only the core textual content (`<p>`, `<h2>`, `<a>`) and valid image tags. Discard layout artifacts.

## 14. Media
- **Public Editorial Images (News/Blogs):** Uploaded to the public R2 bucket. Save URL in `featuredImage`.
- **Private Study PDFs:** Uploaded to the private R2 bucket. Linked via the `Document` model and connected to `Resource.documentId`.
- **Thumbnails:** Do not migrate auto-generated WordPress thumbnail variations (e.g., `-150x150.jpg`). Migrate only original source images.

## 15. PDFs/Documents
- **Handling:** Identify all PDF URLs linked within WordPress posts. Download the physical PDF from the `uploads.zip` source. Upload the PDF to R2. Create a `Document` record. Attach the `Document.id` to the `Resource.documentId` or `Publication.documentId`.

## 16. English/Nepali
- **Rule:** Maintain English and Nepali records completely independently.
- **Handling:** Do NOT attempt to auto-link translated pairs since WordPress was run as two separate installations without WPML. They exist as distinct records in the `Post` or `Resource` models.

## 17. SEO
- **Rule:** Preserve SEO where possible.
- **Handling:** Extract Rank Math SEO titles and descriptions from `wp_postmeta`. Store them in `metaTitle` and `metaDesc` on the `Post` and `Resource` models. Preserve original WordPress `post_name` (slug).

## 18. Redirects
- **Rule:** Map legacy WordPress routes to Next.js routes.
- **Handling:** Generate entries in the Prisma `Redirect` model mapping `/category/[slug]/` to the new subject/resource paths, and old post URLs to their new dynamic routes.

## 19. Status Lifecycle
- **WordPress 'publish':** → `ContentStatus.PUBLISHED`
- **WordPress 'draft':** → `ContentStatus.DRAFT`
- **WordPress 'inherit' / 'revision':** → Dropped (Not Migrated)

## 20. Human Review Queue
A migration review field or tag (e.g., `MIGRATION_REVIEW`) will be applied to any `Resource` where `subjectId = NULL`.
The Admin Dashboard must allow Editors to filter for these resources and assign them manually to Semesters/Subjects/Units.

## 21. Data Preservation Rules
- Original IDs, creation dates, and modified dates will be preserved in PostgreSQL to ensure historical continuity.
- Authors will be preserved if the user exists; otherwise, map to a default Admin or set `authorId = NULL`.

## 22. Migration Safety Rules
- **Rule 1:** Migration scripts must be idempotent.
- **Rule 2:** The original WordPress DB must not be modified.
- **Rule 3:** Do not migrate broken links.

## 23. Human Decisions Required Before Phase 4
1. Define the actual `Subject` targets for Corporate Law (6th Sem) and the 7 missing categories (Criminology, etc.).
2. Define the manual resolution process for Family Law (I vs II).

## 24. Final Summary
- **Total WordPress content classes:** 15
- **Automatic mappings:** 12 subjects, 4 ResourceTypes, 3 PostTypes.
- **Mappings requiring NULL subject:** Precedent, Family Law, Missing Subjects, Corporate Law.
- **Human-review categories:** 9 (Corporate Law, Family Law, 7 Missing).
- **Page rebuild requirements:** Static Next.js implementation required for Home, About, Contact. Elementor dropped.
- **Media migration rules:** Original images to Public R2; PDFs to Private R2 + `Document` model.
- **SEO migration rules:** Rank Math meta preserved; legacy URLs mapped via `Redirect` model.
- **English/Nepali rules:** Independent records; no automatic linking.
- **Exact business decisions required:** Subject creation for 8 missing categories, manual assignment workflow for Family Law.
