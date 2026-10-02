
# WORDPRESS TAXONOMY LIVE-SITE VALIDATION

## 1. Executive Summary
A three-way forensic validation was performed using the WordPress SQL Dump (Source A), the live WordPress Website (Source B), and the Prisma Target Taxonomy (Source C). The objective was to determine whether the public website's presentation of content provides the necessary context to resolve ambiguous categories.

The conclusion is definitive: the live WordPress site provides **zero** public information architecture for study materials. There are no study menus, no breadcrumbs, and no semester groupings. The site operates as a flat collection of category archives. Therefore, the database taxonomy remains the sole source of structural truth, and several categories must be marked as requiring human decisions because they conflict with the Prisma target taxonomy.

## 2. Current WordPress Public Information Architecture
- **Main Navigation:** The main menu only contains "About Us", "Contact", "Advertisement", and "Privacy Policy".
- **Breadcrumbs:** Not implemented or not visible on category archives or single posts.
- **Semester Structure:** There is no public grouping of content by Semester.
- **Category Indexing:** Categories exist publicly at `/category/[slug]/` but are completely disconnected from any hierarchy or contextual menus.

## 3. Database vs Live Website Comparison
| Feature | Database (SQL Dump) | Live Website | Discrepancy / Note |
|---|---|---|---|
| Category Hierarchy | Explicit (e.g. Precedent -> Civil) | Invisible. Breadcrumbs do not exist. | Live site degrades context. |
| Post Titles | Full Titles (e.g., "Corporate Law Case: ... (6th sem)") | Title matches DB (when rendered). | Consistent. |
| Post Count | Explicit count in `term_taxonomy` | Pagination on archive pages matches DB. | Consistent. |
| Semester Context | Missing except in random post titles. | Missing entirely. | Consistent lack of data. |

## 4. Prisma Target Taxonomy Comparison
The Prisma schema strictly enforces a `Semester -> Subject` structure (Semesters 1-10). The WordPress site groups topics broadly by legal discipline (e.g., "Gender and Inclusive Justice") without mapping them to the university curriculum semesters.

## 5. Corporate Law and Management
- **Database:** Category 149. Posts are titled "Corporate Law Case: [Name]". One post is explicitly titled "... (6th semester)".
- **Live Site:** `/category/corporate-law-and-management/` exists but has no breadcrumbs.
- **Prisma:** 5th Semester has "Company Law". 6th Semester does not have Corporate Law.
- **Result:** `HUMAN_DECISION_REQUIRED`. (Cannot force into Company Law due to 6th-semester label; cannot map to 6th Semester because the Subject does not exist).

## 6. Criminology and Penology
- **DB & Live Site:** Category 129. Posts are titled "Criminology and Penology Case: ...".
- **Prisma:** Subject does not exist in Semesters 1-10.
- **Result:** `NO_VALID_PRISMA_MATCH`.

## 7. Election Law
- **DB & Live Site:** Category 143. Posts are titled "Election Law Case: ...".
- **Prisma:** Subject does not exist in Semesters 1-10.
- **Result:** `NO_VALID_PRISMA_MATCH`.

## 8. Fiscal Law
- **DB & Live Site:** Category 150.
- **Prisma:** Subject does not exist in Semesters 1-10.
- **Result:** `NO_VALID_PRISMA_MATCH`.

## 9. Gender and Inclusive Justice
- **DB & Live Site:** Category 151.
- **Prisma:** Subject does not exist in Semesters 1-10.
- **Result:** `NO_VALID_PRISMA_MATCH`.

## 10. Interpretation of Law
- **DB & Live Site:** Category 147.
- **Prisma:** Subject does not exist in Semesters 1-10.
- **Result:** `NO_VALID_PRISMA_MATCH`.

## 11. Juvenile Delinquency
- **DB & Live Site:** Category 128.
- **Prisma:** Subject does not exist in Semesters 1-10.
- **Result:** `NO_VALID_PRISMA_MATCH`.

## 12. Socio Economic Crime
- **DB & Live Site:** Category 146.
- **Prisma:** Subject does not exist in Semesters 1-10.
- **Result:** `NO_VALID_PRISMA_MATCH`.

## 13. Family Law
- **DB & Live Site:** Category 122. Archive `/category/family-law/`. Posts are titled "Family Law Case: ...".
- **Prisma:** Contains Family Law-I (3rd Sem) and Family Law-II (4th Sem).
- **Result:** `MIXED_CATEGORY`. Neither the DB nor the Live Site distinguishes between I and II. Must be left NULL with `PER_RESOURCE_HUMAN_DECISION_REQUIRED`.

## 14. Precedent / Civil / Criminal / Writs
- **DB:** Broad case tags grouping multiple subjects (e.g. Civil contains Contract, Evidence, Family).
- **Live Site:** Category archives `/category/civil/`, `/category/criminal/`, `/category/writs/`. No subject context provided.
- **Prisma:** Precedent is not a subject.
- **Result:** `AUTO_APPROVE` mapping to `ResourceType = CASE_LAW` and `Subject = NULL`. Do not force into Civil Procedure / Criminal Procedure.

## 15. Elective Evidence
Neither the Database nor the Live Site provides explicit evidence that any of the unmatched categories (e.g., Criminology, Election Law) are officially "Electives". Therefore, they cannot be safely mapped to Elective-I, II, III, or IV.

## 16. Database vs Live-Site Discrepancies
- **Finding:** There are no contradictory data points between the DB and the Live Site.
- **Finding:** The primary discrepancy is *omission*. The DB records hierarchical relationships (`parent_id`), but the Live Site fails to render them publicly (no menus, no breadcrumbs).
- **Implication:** The DB is the sole reliable source of categorization.

## 17. Final Recommended Mapping Rules
1. Map explicitly confirmed subjects (e.g., Labour Law -> Labor Law, Criminal Law-II -> Criminal Law-II).
2. For Precedent/Civil/Criminal/Writs, assign `ResourceType = CASE_LAW` and leave Subject null.
3. For unmatched subjects, leave Subject null and flag for human review. Do not auto-create subjects.

## 18. Human Decisions Required
- How to classify Family Law posts (I vs II).
- How to handle Corporate Law (6th Sem WP post vs 5th Sem Prisma subject).
- Whether to add the unmatched categories as new Prisma Subjects or group them under Electives.

## 19. Categories Requiring New Prisma Subjects
If parity with WordPress is desired, the following Subjects must be added to the Prisma schema (or mapped to Electives by business logic):
- Criminology and Penology
- Election Law
- Fiscal Law
- Gender and Inclusive Justice
- Interpretation of Law
- Juvenile Delinquency
- Socio Economic Crime
- Corporate Law and Management

## 20. Migration Safety Notes
Since the Live Site has no public IA, migrating the content into the highly structured Prisma taxonomy will require significant manual tagging by the Admins post-migration for any category marked UNRESOLVED.
