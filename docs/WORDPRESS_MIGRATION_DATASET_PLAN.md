# WORDPRESS MIGRATION DATASET PLAN

## 1. Objective
Define the precise data pipeline to securely and robustly transform the unstructured WordPress `.sql` dumps and `.zip` files into a format that can safely seed the new Prisma PostgreSQL database and Cloudflare R2 infrastructure.

## 2. Recommended Migration Pipeline

The migration should be executed via a dedicated local Node.js script (`scripts/migrate-wordpress.ts`) that will never run in production.

### Phase A: Parsing & Normalization
1. **Unzip & Mount:** The `entertainlawyers-*-uploads.zip` directories must be unzipped to a local temporary path.
2. **Database Mounting:** The `.sql` dumps must be loaded into a local ephemeral MySQL database (e.g., via Docker) to allow standard SQL queries (e.g. `SELECT * FROM wp_posts JOIN wp_postmeta`). Parsing the 50MB SQL file directly with regex is too fragile.
3. **Extraction Queries:** Execute SQL queries against the local MySQL instance to extract JSON arrays of normalized data (Users, Categories, Posts, PostMeta).

### Phase B: Cleansing & Transformation
4. **HTML Sanitization:**
   - Parse `post_content`.
   - Use Regex/Cheerio to identify and extract `[dflip]` shortcodes.
   - Strip Elementor structural divs (`elementor-widget-wrap`, `elementor-container`) while preserving internal `<p>`, `<h1>`, and `<img>` tags.
5. **Taxonomy Resolution:**
   - Map WP Category IDs to explicit Semester and Subject UUIDs predefined in a configuration dictionary.

### Phase C: Media Upload (Cloudflare R2)
6. **Public Media Pipeline:**
   - Iterate over `featuredImage` URLs extracted from WP attachments.
   - Locate the exact file in the unzipped `uploads/` directory.
   - Upload file to the Public Cloudflare R2 bucket.
   - Store the resulting R2 URL.
7. **Private Document Pipeline:**
   - Iterate over extracted PDF filenames.
   - Upload file to the Private Cloudflare R2 bucket.
   - Store the resulting R2 URL in a staging `Document` JSON.

### Phase D: Database Seeding (PostgreSQL)
8. **Prisma Insertion:**
   - Using Prisma, bulk insert `User` records.
   - Bulk insert `Post` records (News/Blogs).
   - Bulk insert `Document` records.
   - Bulk insert `Resource` records, linking to `Document`, `Subject`, and `User`.

### Phase E: Redirect Map Generation
9. **Redirect Map:** Output a `redirects.json` file mapping all old `/%postname%/` slugs to their new Next.js routes (`/study/[id]`, `/news/[slug]`) to be consumed by `next.config.mjs` for SEO preservation.

## 3. Required Intermediate Data Structures
The script should output intermediate `.json` files before touching Prisma, allowing manual review:
- `migration-staging-users.json`
- `migration-staging-posts.json`
- `migration-staging-resources.json`
- `migration-staging-redirects.json`
