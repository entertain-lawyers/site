# WORDPRESS CONTENT CLASSIFICATION

## 1. Content Types

### Posts (`post`)
- **Total English:** ~200+ active published posts.
- **Total Nepali:** ~70+ active published posts.
- **Usage:** WordPress overloads the `post` type heavily. It contains News, Blogs, Study Notes, Case Laws, and Question Papers.

### Pages (`page`)
- **Usage:** Used for static layout pages (Home, About Us, Contact). These should generally not be migrated into the new database unless they fit an existing Prisma model, but should be recreated as static Next.js React components.

### Revisions & Autosaves
- **English:** 99+ revisions detected.
- **Nepali:** 64+ revisions detected.
- **Decision:** Revisions should be DROPPED entirely during the migration to keep the PostgreSQL database clean.

## 2. Elementor Content Complexity
Almost ~50 items explicitly contain `elementor` strings in the raw `post_content` tuple in the SQL dump.
- **Clean HTML:** Some posts use native Gutenberg/Classic Editor. These can be migrated to the new RichTextEditor gracefully.
- **Elementor HTML:** Posts utilizing Elementor will have `[elementor-template id="..."]` or complex nested `<div>` widgets.
- **Transformation Required:** The migration script MUST employ an HTML sanitization pass using `dompurify` or `cheerio` to strip Elementor-specific wrappers (`elementor-section`, `elementor-widget-container`) and extract the underlying textual content or `<p>` tags.

## 3. Taxonomy & Category Mapping
Since standard WordPress Categories dictate the resource type, the following structural mapping is observed:

- Categories mapped to `Post` (Editorial):
  - News (ID 58) -> `Post` where `type = NEWS`
  - Blog (ID 61) -> `Post` where `type = BLOG`

- Categories mapped to `Resource` (Study):
  - Case Law (ID 113) -> `Resource` where `type = CASE_LAW`
  - Notes (ID 121) -> `Resource` where `type = LAW_NOTE`
  - Question Paper (ID 126) -> `Resource` where `type = OLD_QUESTION`
  - Precedent (ID 79) -> *Ambiguous - Requires Human Decision*

- Sub-categories mapped to `Subject`:
  - Categories like "Criminal Law-I", "Property Law" sit as children of the Resource Type.
  - The migration script must map these string titles to the explicit Prisma UUID for that Subject.

## 4. Document / FlipBook Shortcodes
A significant challenge is the `3d-flipbook-dflip-lite` shortcode.
- Embedded documents are stored in `post_content` as shortcodes: `[dflip id="123"][/dflip]`.
- The migration script must perform a Regex extraction to locate the PDF URL, then create a distinct `Document` record in PostgreSQL linked to the newly created `Resource`.
