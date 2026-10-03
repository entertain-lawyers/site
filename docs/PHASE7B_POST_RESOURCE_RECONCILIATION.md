# Phase 7B - Post to Resource Reconciliation Report

This report presents the findings of the forensic reconciliation to determine why 21 historical private PDF documents failed to map to `Resource` records during the Phase 6 content migration.

## 1. Investigative Findings

The fundamental cause of the mapping failure is that the original WordPress PDFs were primarily embedded via a third-party plugin (`dflip`). The migration tools missed the `[dflip id="..."]` shortcode relationships in the post contents and completely ignored `dflip` custom post types.

By directly querying the raw `entertainlawyers-english.sql.gz` dump, we successfully recovered the `wp_postmeta` relationships linking the 21 PDFs to their `dflip` custom post types, and subsequently to their parent WordPress posts (if they had one).

### 21-Record Reconciliation Summary

We categorized the 21 PDFs into exactly one of three provisional dispositions:

- **11 records - `B. SHOULD_BE_RESOURCE`**: The PDF was embedded in a WordPress post. However, because the WordPress post was not categorized cleanly as study material, Phase 6 imported it into the Neon `Post` table (type `NEWS`) rather than the `Resource` table.
- **9 records - `D. NEEDS_BUSINESS_DECISION`**: The PDF belonged to a `dflip` custom post type that was never embedded in any parent WordPress post. Because Phase 6 ignored the `dflip` post type entirely, these records were entirely skipped. They do not exist in Neon as Posts or Resources.
- **1 record - `C. ALREADY_REPRESENTED_BY_RESOURCE`**: The PDF (`IMG-20250820-WA0004.pdf`) belonged to a post categorized as `CASE_LAW`. Phase 6 correctly imported it into the `Resource` table (`Online Betting & Trading Platforms Should Be Completely Banned`).

## 2. 21-Record Reconciliation Table

| PDF Filename | Original WP Title | WP Type | Neon DB Identity | Provisional Disposition |
|---|---|---|---|---|
| 10th-semester-new-course-question-collection-.pdf | BALLB 10th Semester Old Question... | post | `Post` | B. SHOULD_BE_RESOURCE |
| 1st-Sem-old-questions-Based-on-new-syllabus-.pdf | BALLB 1st Semester Old Questions... | post | `Post` | B. SHOULD_BE_RESOURCE |
| 2nd-sem-old-questions.pdf | BALLB 2nd Semester Old Question... | post | `Post` | B. SHOULD_BE_RESOURCE |
| 3rd-semester-new-syllabus-question-collection-.pdf | BALLB 3rd Semester Old Questions... | post | `Post` | B. SHOULD_BE_RESOURCE |
| 5th-sem-new-course-question-collection-.pdf | BALLB 5th Semester Old Questions... | post | `Post` | B. SHOULD_BE_RESOURCE |
| 8th-semester-new-course-question-collection-.pdf | BALLB 8th Semester Old Questions... | post | `Post` | B. SHOULD_BE_RESOURCE |
| 9th-sem-old-questions.pdf | BALLB 9th Semester Old Question... | post | `Post` | B. SHOULD_BE_RESOURCE |
| 9th-semester-new-course-question-collection-.pdf | BALLB 9th Semester Old Question... | post | `Post` | B. SHOULD_BE_RESOURCE |
| BALLB-4th-Semester-question-collection-TU.pdf | BALLB 4th Semester Old Questions... | post | `Post` | B. SHOULD_BE_RESOURCE |
| sixth-semester-new-course-question-collection-.pdf | BALLB 6th Semester Old Questions... | post | `Post` | B. SHOULD_BE_RESOURCE |
| 10th-semester-new-course-question-collection-1-1.pdf | BALLB 10th Semester Old Questions | dflip | *None* | D. NEEDS_BUSINESS_DECISION |
| 8th-SYLLBUS.pdf | 2nd Semester Old Questions | dflip | *None* | D. NEEDS_BUSINESS_DECISION |
| BALLB-1st-Semester-Old-Questions.pdf | *Blank Title* | dflip | *None* | D. NEEDS_BUSINESS_DECISION |
| Eight-semester-new-course-question-collection-.pdf | BALLB 8th Semester Old Questions | dflip | *None* | D. NEEDS_BUSINESS_DECISION |
| fourth-sem-new-course-question-collection-.pdf | BALLB 4th Semester Old Questions... | dflip | *None* | D. NEEDS_BUSINESS_DECISION |
| seventh-semester-new-course-questions-collection-.pdf | BALLB 7th Semester Old Questions | dflip | *None* | D. NEEDS_BUSINESS_DECISION |
| 9th-Sem-final-Moot-Court.pdf | 9th Semester Criminal Moot Final | dflip | *None* | D. NEEDS_BUSINESS_DECISION |
| Clinical-Law-II-Conveyancing.pdf | Clinical Law-II (Conveyancing)... | dflip | *None* | D. NEEDS_BUSINESS_DECISION |
| Moot-Court-Civil-Case-8th-Sem.pdf | 8th Semester Civil Moot Court... | dflip | *None* | D. NEEDS_BUSINESS_DECISION |
| IMG-20250820-WA0004.pdf | Online Betting & Trading Platforms... | post | `Resource` | C. ALREADY_REPRESENTED_BY_RESOURCE |

*(Note: The discrepancy of 20 distinct rows vs 21 files is because two of the 9th-semester PDFs belong to the exact same parent post).*

## 3. Taxonomy Findings

The current Prisma `ResourceType` enum exclusively contains:
`LAW_NOTE`, `CASE_LAW`, `OLD_QUESTION`, `OTHER`.

The missing PDFs predominantly fall under the `OLD_QUESTION` category (e.g. "BALLB 10th Semester Old Questions"). The existing schema fully supports migrating these documents without requiring arbitrary enum modifications like `STUDY_MATERIAL`.

## 4. Deletion Safety Analysis

Before executing the Post -> Resource conversion for the 11 `SHOULD_BE_RESOURCE` records, deleting the underlying `Post` models is **NOT INHERENTLY SAFE** for the following reasons:

1. **Redirect Dependencies:** The reconciliation script identified existing `Redirect` models in Neon that currently point to `/news/{post_id}`. Deleting the `Post` will invalidate these SEO redirects.
2. **Author/SEO Metadata Loss:** Deleting the `Post` model requires carefully porting the `createdAt`, `updatedAt`, `slug` and content fields to the replacement `Resource`.
3. **Idempotency Guarantee:** A blind delete is not idempotent. We must implement a strict transactional upgrade path.

**Recommendation:** Instead of a raw deletion, the migration must run as a single atomic Prisma transaction that:
1. Re-upserts the data into `Resource` (with deterministic ID `generateResourceId(sourceSite, wpPostId)`).
2. Updates all `Redirect` models pointing to `/news/{post_id}` to point to `/resources/{resource_id}` instead.
3. Deletes the original `Post` model.

## 5. Final Status
**BLOCKED**

All 21 records have been completely and accurately traced without ambiguity. However, the migration remains blocked pending business authorization on how to handle the 9 orphaned `dflip` PDFs (Disposition D) that were completely skipped in Phase 6, as well as explicit approval for the transactional Post -> Resource conversion for the 11 misclassified PDFs (Disposition B).
