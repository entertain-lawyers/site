# Phase 7B - PDF Conflict Forensic Resolution

## Forensic Investigation Results

The deterministic mapping collision occurred because WordPress Post `3907` historically had **two distinct PDF files** uploaded directly to its media library (`post_parent = 3907`), despite the post content only displaying one (`[dflip id="3919"]`).

### 1. PDF Extracted Metadata

| Evidence | PDF 1 (`9th-sem-old-questions.pdf`) | PDF 2 (`9th-semester-new-course-question-collection-.pdf`) | Interpretation |
|---|---|---|---|
| **Title Metadata** | "9th sem old questions" | "9th semester new course question collection" | The files explicitly declare different academic contexts. |
| **Page Count** | 20 pages | 23 pages | They are structurally different documents. |
| **File Size** | 9.4 MB | 4.4 MB | They contain materially different content. |
| **Syllabus/Course** | Old Course Syllabus | New Course Syllabus | **Critical distinction:** They represent two entirely separate curricula for the 9th semester. |

### 2. WordPress Source Evidence (WP Post 3907)

- **Post Title:** `BALLB 9th Semester Old Question based on new Course/Syllabus`
- **Post Content:** `[dflip id="3919"][/dflip]`
- **Archived Neon ID:** `e928c98a-29f6-5e4e-95ae-7712d1a89d1d`
- **Target Resource ID:** `1cbfe25a-658b-5cf4-9d36-f9d72df004a3`
- **Interpretation:** The post title explicitly references the "new Course/Syllabus", which perfectly matches PDF 2. PDF 1 (the old syllabus) was uploaded to this post in the media library but likely abandoned or mistakenly attached during authorship.

### 3. Current Target Resource (`1cbfe25a...`)

- **Title:** BALLB 9th Semester Old Question based on new Course/Syllabus
- **Type:** OLD_QUESTION
- **Subject/Semester:** null (Phase 5 default)
- **Status:** PUBLISHED

## Forensic Conclusion

**TWO_DISTINCT_RESOURCES**

The source evidence overwhelmingly proves these are two distinct logical resources (Old Syllabus vs. New Syllabus). The 1:1 `Resource.documentId` schema is entirely correct; the anomaly was caused by sloppy WordPress media library authorship where a logically separate document was uploaded as a background attachment to the wrong post.

### Proposed Resolution

I recommend separating them into two distinct `Resource` records:

1. **Retain PDF 2 on the original Resource:**
   - **Target ID:** `1cbfe25a-658b-5cf4-9d36-f9d72df004a3` (Already exists)
   - **Title:** BALLB 9th Semester Old Question based on new Course/Syllabus
   - **PDF:** `9th-semester-new-course-question-collection-.pdf`
   - **Type:** OLD_QUESTION

2. **Create a NEW Resource for PDF 1:**
   - **Target ID:** Generate a new deterministic UUID based on the PDF's intrinsic hash or original attachment ID (e.g., WP attachment ID 3918).
   - **Title:** 9th Semester Old Questions (Old Course)
   - **PDF:** `9th-sem-old-questions.pdf`
   - **Type:** OLD_QUESTION
   - **Subject/Semester:** null

## Safety Report
- Neon writes: 0
- WordPress writes: 0
- B2 writes: 0
- Prisma schema changes: 0
- Resource changes: 0
- Document changes: 0

Execution of Stage C remains safely halted pending your authorization to apply this two-resource split.
