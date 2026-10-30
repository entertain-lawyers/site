# Production preflight, admin publishing readiness, and content gaps

Evidence-based companion to PR #37. Nothing in this document has been executed
against production, and nothing may be without explicit owner approval.

---

## 1. Admin publishing readiness (`/admin/posts`)

### Traced operations and their credential requirements

All post writes go through server actions in
`src/modules/admin/admin-post.actions.ts` and the WP client in
`src/lib/wordpress.ts`. Every write calls `getWordPressAuthHeader()`, which
throws `WordPressAuthError` when `WP_AUTH_HEADER` (or
`WP_AUTH_USERNAME` + `WP_AUTH_APP_PASSWORD`) is missing, and each action
surfaces that as "WordPress API Error: Server credentials missing or invalid."
The actions additionally hard-stop writes when `VERCEL_ENV === 'preview'` or
`WP_READ_ONLY === 'true'`.

| Operation (UI entry) | Server path | Reads/writes | Requires `WP_AUTH_*`? |
|---|---|---|---|
| List posts (all tabs) | `getWordPressPosts` | read | Only for `draft`/`trash` tabs (WP returns 401 for private statuses otherwise; those tabs show a lock notice) |
| Search / filter / categories | `getWordPressPosts`, `getWordPressCategories` | read | No |
| Create post (`/admin/posts/new` → `createPostAction`) | `createWordPressPost` (`POST /posts`) | write | **Yes** |
| Save as draft on create (`status: DRAFT`) | same, `status: 'draft'` | write | **Yes** |
| Edit post (`/admin/posts/[id]/edit` → `updatePostAction`) | `updateWordPressPost` (`POST /posts/{id}`) | write | **Yes** |
| Publish / unpublish from editor (`isPublished`) | same, `status: 'publish' \| 'draft'` | write | **Yes** |
| Preview (`/preview` hand-off) | client-side only | read of editor state | No (does not round-trip WP; it renders the local editor HTML) |
| Trash single post (`DeletePostButton` → `deletePostAction`) | `deleteWordPressPost(id, force=false)` = WP trash | write | **Yes** |
| Bulk trash / publish / draft / delete permanently (`PostsTableClient` → `bulkUpdatePostStatusAction`) | `deleteWordPressPost` / `updateWordPressPost` | write | **Yes** (bulk errors are reported per-post count) |
| Public pages (`/news/[id]`, `/nepali/post/[id]`) | `getWordPressPostBySlug/ById` | read | No (published content only) |

**Status without credentials:** create, edit, draft, publish, trash, and
permanent delete all **fail** with the missing-credentials error. Nothing in
this PR claims otherwise; the admin UI states the exact env vars needed.

Cache revalidation: WP client calls `revalidateTag('wordpress', …)` on every
successful write (`invalidateCacheTags(lang)`), so public pages pick up
changes on the next request after a write succeeds.

### Staging WordPress test plan (safe — never touches the live site)

Prerequisites (owner performs these once):

1. Create a **dedicated WP account** in the staging/legacy WordPress with the
   `Administrator` or `Editor` role, application password only
   (`Users → Profile → Application Passwords`).
2. Point `WP_ENGLISH_URL` (and `WP_NEPALI_URL`) at the **staging** WordPress
   REST base in a disposable build environment; set `WP_AUTH_USERNAME` /
   `WP_AUTH_APP_PASSWORD` for the staging account only. Verify the URL scheme:
   `https://<staging-host>/wp-json/wp/v2`.
3. Confirm `VERCEL_ENV` is not `preview` in that environment and
   `WP_READ_ONLY` is unset — otherwise writes are refused by design.
4. DNS/hosts: ensure the staging WordPress is NOT the same install as
   `entertainlawyers.com`. Test slugs below must be prefixed `zz-test-` so
   they are trivially identifiable and cleanable.

Execute the following sequence against the staging install, recording each
result (HTTP status, WP post id, public URL):

| # | Step | Expected |
|---|---|---|
| 1 | `/admin/posts/new`: title `zz-test publish flow`, body with a heading, a link, and an `style="text-align:center"` paragraph | Action returns an id; audit log row `POST_WP CREATE` created |
| 2 | Save as draft (`status: DRAFT`) | WP returns `status: 'draft'`; `GET /posts/{id}` without auth → 401; with auth → draft |
| 3 | Edit (`/admin/posts/{id}/edit?lang=en`), change title/body, save | WP `modified` ≠ `date`; body matches editor HTML |
| 4 | Preview from editor | `/preview` window renders editor HTML before any WP write (preview is local-only) |
| 5 | Publish (`isPublished: true`) | WP `status: 'publish'`; `GET /posts/{id}` publicly → 200 with new content |
| 6 | public URL | `https://<staging-host>/<post-slug>/` renders the published content (WordPress side) and the Next app renders it on its news detail page for the same WP id |
| 7 | Cache revalidation | Immediately after publish, the Next public page reflects the content without a redeploy (`revalidateTag` fired). If stale, check Next fetch-cache tags (`wordpress-en`) |
| 8 | Trash the test post (`bulkUpdatePostStatusAction` `TRASH`) | WP `status: 'trash'`; it disappears from public listing |
| 9 | Restore from Trash tab, then `DELETE_PERMANENTLY` | Post is gone from `GET /posts/{id}` (404). Trash tab requires auth — verify the lock notice appears when auth is removed |
| 10 | Cleanup | Delete `zz-test-*` content and its audit-log rows are retained (audit log is append-only history) |

Any step that fails must record the exact action name, HTTP status, and
reference id before the migration to real credentials is approved.

---

## 2. Production migration preflight (read-only; do not run the destructive parts)

Target: apply **only** the pending migration
`20261030120000_add_consultation_lawyer`. It is additive (`CREATE TABLE`,
two `CREATE INDEX`es); it cannot drop or alter existing data.

### Step 0 — Take a backup (owner)

- Managed Postgres: enable/verify point-in-time recovery; take a manual
  snapshot or `pg_dump --schema-public -Fc` just before the migration.
- Record the byte size and checksum of the dump. Do not proceed without a
  restorable backup.

### Step 1 — Read-only preflight (safe to run anytime)

Use a read-only connection. `psql` (values redacted in any output that may be
shared):

```sql
-- Which migrations does Prisma think are applied, and are any
-- failed/unfinished? Expect: no rows with finished_at IS NULL.
SELECT migration_name, finished_at IS NULL AS unfinished, rolled_back_at
FROM "_prisma_migrations"
ORDER BY started_at;

-- Confirm the last applied migration matches the repo's second-newest.
SELECT migration_name FROM "_prisma_migrations"
ORDER BY started_at DESC LIMIT 3;

-- Confirm the table truly does not exist yet (expect: NULL).
SELECT to_regclass('public."ConsultationLawyer"');

-- Either of these CLI equivalents (no schema changes):
--   npx prisma migrate status   (against production DATABASE_URL)
--   npx prisma migrate diff --from-url "$PROD_URL" \
--       --to-schema-datamodel prisma/schema.prisma --exit-code
```

Expected result: exactly **one** pending migration —
`20261030120000_add_consultation_lawyer`. If `prisma migrate status` shows any
other pending or failed migration, **stop** and resolve that first; the
deploy below only assumes this single additive migration is what is missing.

### Step 2 — Execution (owner, with a change window if the site has traffic)

```bash
# One-time, against production DATABASE_URL (prefer DIRECT_URL for direct TCP):
npx prisma migrate deploy
```

`migrate deploy` is non-interactive and only applies pending migrations
recorded in the repo; it never resets, edits, or drops data.

### Step 3 — Post-migration verification

```sql
SELECT to_regclass('public."ConsultationLawyer"');            -- expect the table
SELECT count(*) FROM "ConsultationLawyer";                   -- expect 0 (empty start)
SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NULL;  -- expect 0
```

Then, on a deployed build of this branch:

1. `/admin/lawyers` loads with "No lawyer profiles" empty state (not an error).
2. Create a real lawyer profile through the UI (real details, owner's data).
3. `/consultation` shows that lawyer.
4. Toggle availability → the lawyer leaves `/consultation` but stays in admin.

### Recovery

- If `prisma migrate deploy` fails mid-run: it is transactional per migration.
  Failure before `finished_at` leaves the DB as it was for this migration
  (no table), and `prisma migrate resolve` is not needed because the script
  did not complete. Re-run after fixing the cause.
- If the table must be removed after a bad approval (it starts empty):

  ```sql
  DROP TABLE IF EXISTS "ConsultationLawyer";
  DELETE FROM "_prisma_migrations" WHERE migration_name = '20261030120000_add_consultation_lawyer';
  ```

  Only when it contains real data: restore from the Step 0 backup instead.

---

## 3. Content gap report

### 3.1 WordPress articles (verified live, 2026-10-30)

- English posts: **344** (`x-wp-total` on `/wp-json/wp/v2/posts`; pages
  100 + 100 + 100 + 44).
- Nepali posts: **14** (`x-wp-total` on `/nepali/wp-json/wp/v2/posts`).
- English pages: **29**; English categories: **47** (was 46 in the earlier
  audit; re-fetched, not assumed).
- Both languages are served live at read time; no DB copy owns them.
- Spot-checked full records for EN id 5769 and NE id 2411: title, excerpt,
  content, categories, author, featured media and `_embedded` media all
  present; `modified` is newer than `date` on the Nepali sample.

### 3.2 Sitemap and canonical origin (fixed in `fix/post-merge-production-audit`)

Before the fix the sitemap emitted **38** URLs and hardcoded
`https://www.entertainlawyers.com`, and no WordPress article was listed.

The fix:
- `src/lib/seo.ts` now exposes `getSiteUrl()`, the single origin source. It
  reads the validated `NEXT_PUBLIC_APP_URL` (see `src/env.ts`; the same value
  already drives payment callbacks) and normalises it to a bare origin. No
  `www`/apex is assumed and no preview URL is used.
- `src/app/sitemap.ts` pages through the WordPress REST API
  (`per_page=100`, `X-WP-TotalPages`) for English and Nepali, and adds every
  article that has a real public route:
  - `NEWS` → `/news/{id}`
  - `BLOG` → `/blogs/{id}`
  - `FACT`, `PERSONALITY` → `/historical-facts/{id}`
  - `NEPALI_*` → `/nepali/post/{id}`
  It skips `OPINION` and the semester/case-note categories because the site
  has no route for them (they 404), so the sitemap never advertises a dead URL.
- WordPress failures are **not** swallowed: article enumeration uses
  `throwOnError`, so an outage returns a failed sitemap (crawlers retry)
  instead of a "complete" sitemap missing hundreds of articles.
- `src/app/robots.ts`, the root `metadataBase`/Open Graph URL/JSON-LD and the
  semester/resource breadcrumbs now use the same `getSiteUrl()` origin.

Measured locally after the fix (real WP data, local `.env` origin
`https://entertainlawyers.com`): **96 URLs** — 23 static, 15 DB-owned, and 58
articles (38 NEWS, 2 BLOG, 4 historical-facts, 14 Nepali), zero duplicates.
The remaining English posts are the 291 posts in unmapped semester/case-note
categories and 9 `OPINION` posts; they have no public route and are reported
below, not listed in the sitemap.

### 3.3 The 29 English WordPress pages

Fetched live from `/wp-json/wp/v2/pages?per_page=100` (`X-WP-Total: 29`, all
`publish`). The previous revision of this document grouped 30 pages because it
listed a `contract-law-ii` page that does not exist and omitted
`4th-semester-notes`. The reconciled list is exactly these 29 slugs:

`property-law`, `legal-nepali-i`, `legal-method`, `criminal-law-i`,
`contract-law-i`, `10th-semester`, `9th-semester`, `8th-semester`,
`7th-semester`, `6th-semester`, `2nd-semester`, `1st-semester`, `5th-semester`,
`3rd-semester`, `family-law`, `comparative-law`, `public-international-law-ii`,
`criminal-law-ii`, `4th-semester-notes`, `old-questions`, `law-notes`,
`historical-facts`, `case-page`, `home-2`, `home`, `contact`, `about-2`,
`advertisement`, `privacy-policy`.

| WP page (slug) | New-site equivalent | Disposition |
|---|---|---|
| `1st-semester` … `10th-semester` plus `4th-semester-notes` (10 pages) | DB-owned `Semester` model (`/semesters/[id]`) | Intentionally superseded by DB content |
| `contract-law-i`, `criminal-law-i`, `criminal-law-ii`, `family-law`, `property-law`, `legal-method`, `legal-nepali-i`, `comparative-law`, `public-international-law-ii` (9 pages) | DB-owned `Subject`/`Unit` content | Intentionally superseded; spot-check each subject during content QA |
| `law-notes`, `old-questions` | `/study`, `/resources`, DB `Resource` | Intentionally superseded |
| `historical-facts` | `/historical-facts` route | Intentionally superseded |
| `case-page` | Case-law sections under `/study` | Intentionally superseded; verify link coverage during QA |
| `home`, `home-2` | Next homepage (`HomepageConfig`) | Intentionally excluded (legacy builder variants) |
| `about-2` | `/about` | Intentionally excluded (duplicate) |
| `contact` | `/contact` | Intentionally excluded |
| `privacy-policy` | `/privacy-policy` | Intentionally excluded — wording differs materially, see 3.5; do not replace the reviewed text without approval |
| `advertisement` | none found | **Needs a decision**: no obvious route carries it; either migrate as a static page or record as intentionally dropped |

9 + 10 + 2 + 1 + 1 + 2 + 1 + 1 + 1 + 1 = **29**. The "intentionally
superseded" column is a structural mapping, not a per-paragraph content diff.

### 3.5 Privacy policy: legacy vs new wording (comparison only)

| Topic | Legacy WordPress page | New `/privacy-policy` | Material? |
|---|---|---|---|
| Information collected | name, email, phone; browser/device/pages/time | name, email, **payment details**, educational information, IP address, browser, pages, access times | Yes — new adds payment/education/IP |
| Use of data | answer questions, newsletters, site improvement, **targeted advertising / sponsored content** | transactions/subscriptions, identity verification, support, platform updates | Yes — advertising clause absent in the new page |
| Sharing | "we do not sell or share" except legal obligation and confidential service providers | not covered | Yes — missing in the new page |
| Cookies | explicitly covered | not covered | Yes — missing in the new page |
| Data security | industry-standard measures | robust measures + payment gateways | Similar |
| Third-party links | covered | not covered | Yes — missing in the new page |
| Children's privacy (<13) | covered | not covered | Yes — missing in the new page |
| Policy changes | "changes will be posted on this page" | not covered | Yes — missing in the new page |
| Contact | contact email/phone | contact section | Equivalent |

The new page is not a copy of the legacy one and drops several clauses. This
is a **legal-review item**, not a code defect; the reviewed text was not
replaced.

### 3.4 Production database counts (BLOCKED — not inferred)

`vercel env pull` returns `[SENSITIVE]` for `DATABASE_URL`, so production row
counts could not be read for any DB-owned model. Local counts (verified here,
single-digit DB): FAQ 0, Event 0, Publication 0, Gallery 0, Resource 0,
Post 0, Redirect 0, BuilderPage 0, TeamMember 5, Semester 10, Subject 115,
Unit 556, ConsultationLawyer 1, ConsultationRequest 0, User 1.
Production numbers must be read during the Step 1 preflight and appended to
the preflight evidence before sign-off.

---

## 4. Verification status of this update

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx vitest run` (no disposable DB) | PASS (236 passed, 79 skipped) |
| `npx vitest run` with `TEST_DATABASE_URL` (disposable `entertain_lawyer_test`, all migrations applied) | PASS (318 passed, 1 skipped) |
| `npm run build` | PASS |
| Sitemap local render with live WP data | PASS — 96 URLs, one origin, 58 article URLs, no duplicates |
| Sanitizer vs 40 real WP articles | PASS — all article formatting preserved; plugin-only declarations (`fill`, `cursor`, `display`, `font-family`, `font-style: inherit`) removed; transparent colours and oversized font/margin values now rejected |
| Lint | Pre-existing repo-wide failure unchanged; no new findings in changed files |
| Staging publish flow | NOT EXECUTED — requires staging WP credentials (plan above) |
| Production preflight | NOT EXECUTED — owner read-only access required (runbook above) |
| Production authenticated admin/CRUD | BLOCKED — no authorised production ADMIN session available |
