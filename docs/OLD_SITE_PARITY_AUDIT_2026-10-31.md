# Old site → new site parity audit (2026-10-31)

Source: live WordPress REST API on https://entertainlawyers.com, the new
site's public routes, the migration staging data, and (after owner approval)
the production database.

## WordPress inventory (live today)

| Content | Count | How the new site gets it | Status |
|---|---|---|---|
| English news / blog / historical facts / personalities | 53 posts | Fetched live (`/news`, `/blogs`, `/historical-facts`) | OK — sampled IDs return 200 |
| English opinion | 9 posts | Fetched live | **Was 404** (`/blogs/3392`). Code fix in this branch: opinion is served under `/blogs` |
| Nepali posts | 14 | Fetched live (`/nepali/post/{id}`) | OK |
| English study posts (case laws, notes, question papers) | ~270 posts | `Resource` table | Body text missing on most rows and 111 posts absent — fixed on production, see below |
| Pages | 29 | Rebuilt as Next.js pages | Unchanged since previous audit |
| Media | 653 | Migrated to B2 (Phase 7A) | Not re-verified here |

Before production access, the staging files suggested 179 study posts were
absent (116 held in the review queue + 63 published after the October
extract). Production turned out to already hold 84 of the review-queue posts
(added by a later curriculum pass, with `metaTitle = WP-english-<postId>` but
no body text), so only 111 were truly absent.

## Root causes

- **Lawyers:** migration `20261030120000_add_consultation_lawyer` was committed
  but never applied — the build does not run `prisma migrate deploy` and there
  is no CI step. Every query hit Prisma `P2021` (table does not exist).
- **"Pending Upload" resources:** `scripts/execute-neon-import.js` upserted the
  Phase-6 resources without `content` (the column did not exist then), and the
  later curriculum pass did the same. The admin badge only looked at
  `documentId`, and the public page showed "PDF Coming Soon".

## Executed on production (2026-10-31, owner-approved)

Backup first: `Resource` table (248 rows) and `_prisma_migrations` exported to
CSV at 05:42:38 UTC (also the Neon point-in-time restore target). The local
`pg_dump` 17 cannot dump the Postgres 18 server, so no full dump was taken.
The CSVs are kept outside the repository.

1. `prisma migrate deploy` applied `20261030120000_add_consultation_lawyer`
   (the only pending migration). `ConsultationLawyer` exists with 0 rows. One
   pre-existing `_prisma_migrations` row (a 2026-10-02 attempt of
   `init_cms_architecture`) has `rolled_back_at` set; Prisma ignores it.
2. Content backfill — **215 rows filled**:

   | Starting inventory: 223 rows with no PDF and no text | Rows |
   |---|---|
   | Filled from the staged WordPress extract | 135 |
   | Filled from the live WordPress REST API (`WP-english-<id>` rows) | 79 |
   | Left empty — WordPress post no longer public (HTTP 401: WP#4561, 4564, 4651, 4909, 4370) | 5 |
   | Left empty — admin-created law notes with no WordPress source | 4 |
   | **Total** | **223** |

   The staged pass filled 136 rows: the 135 above plus one row that already had
   a PDF attached. 136 + 79 = 215.
3. Import — **111 resources created**, a re-run reports 0 missing:
   - 70 PUBLISHED with a subject (Gender and Inclusive Justice, Corporate Law
     and Management, Election Law, Procedural Law I/II, Criminology and
     Penology, Juvenile Delinquency, Interpretation of Law, Fiscal Law, Socio
     Economic Crime).
   - 41 DRAFT, not public until an admin assigns a subject: 35 Contract Law
     cases (33 in the "Contract Law-I" category, 2 in generic categories;
     the "Law of Contract - I" alias was rated low confidence in review), 2 cases
     tagged only with court categories, 2 moot-court/clinical files, 2 general
     articles (WP#2984, #2765) that are not study material.

Result: 318 published resources (25 PDF, 285 text, 9 empty) and 41 drafts.

## Script behaviour

Both scripts read `DATABASE_URL`; neither is run by the build.

- `scripts/backfill-resource-content.js` — dry run unless `--apply`. Writes
  only where `content` is NULL or empty, with the same guard in the `UPDATE`.
- `scripts/import-missing-wp-resources.js` — dry run unless `--apply`. Skips
  any post whose deterministic id or `WP-english-<id>` metaTitle already
  exists, and only `create`s (never updates). Subject: an approved mapping from
  `docs/wordpress-semester-subject-mapping.review.json`, otherwise a WordPress
  subject category whose name matches exactly one existing Subject; categories
  the review left unresolved (Family Law, Civil/Criminal/Writs) never match.
  Anything else is created as DRAFT with no subject.

```bash
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:backfill:resource-content            # add -- --apply to write
node scripts/import-missing-wp-resources.js     # add --apply to write
```
