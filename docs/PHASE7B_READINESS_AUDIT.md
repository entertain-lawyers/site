# Phase 7B - Private PDF Migration Readiness Audit

## 1-2. PDF Inventory & Verification
The 21 private PDFs were successfully located in `migration-staging-recovered/documents.json`. For each PDF, the source path, filename, byte size, SHA-256, MIME type, and deterministic B2 target key (`documents/<sha256>/<filename>`) were calculated and verified.

## 3-5. Resource Mapping & DocumentId Check
**CRITICAL ANOMALY DETECTED:** 
None of the 21 PDFs map to an existing `Resource` in the database. 
During the Phase 6 content migration, the WordPress posts associated with these PDFs (e.g., "BALLB 10th Semester Old Questions Based on New Course/Syllabus", "BALLB 4th Semester Old Questions") were imported into the `Post` table with `type: "NEWS"`, rather than into the `Resource` table. 
Because there are no corresponding `Resource` records, we cannot confirm `documentId = NULL` for them. The target Resources simply do not exist yet.

## 6-8. Integrity Confirmations
- **No Duplicate Keys:** Confirmed. All 21 B2 target keys are unique.
- **No Source Ambiguities:** Confirmed. The files uniquely exist in the historical WordPress exports.
- **Excluded from Phase 7A:** Confirmed. A programmatic check of the Phase 7A `upload_manifest.json` confirmed 0 intersections with the 21 PDF deterministic keys.

## 9-10. Prisma Schema Verification
- **Document Model:** Verified. Required fields are `id`, `storageProvider`, `storageKey`, `fileSize`, `mimeType`.
- **Relationship:** Verified. `Resource` has a 1-to-1 relationship with `Document` via a nullable, unique `documentId`. It uses `onDelete: Restrict`, meaning a Document cannot be deleted if a Resource is actively referencing it.

## 11-13. Security & Authorization Verification
- **Storage Path:** Verified. The B2 path for private documents is exactly `documents/`.
- **Private Auth Flow:** Verified in `src/modules/documents/document.actions.ts`. The `getSecureDocumentUrl` server action strictly enforces user authentication (`requireAuth: true`), checks scoped and global rate limits, checks premium entitlements (`canAccessResource`), and finally generates a 300-second (5 minute) presigned B2 URL while logging the access event.
- **Public API Rejection:** Verified in `src/app/api/media/[...key]/route.ts`. The public route explicitly uses an allowlist (`['editorial/', 'gallery/', 'publications/']`) and actively rejects requests for the `documents/` prefix with a 403 Forbidden response.

## 14. Exact Write Requirements for Phase 7B
**B2 Writes Required:**
- 21 `PutObject` calls (Class C) to the private bucket using the `documents/<sha256>/<filename>` keys.

**Neon Writes Required (Due to Anomaly):**
- **Create:** 21 new `Resource` records.
- **Create:** 21 new `Document` records.
- **Update:** Link the newly created `Document` records to the new `Resource` records via `documentId`.
- **Delete/Migrate:** The 21 orphaned `Post` records that currently hold the study material content must be deleted or converted.

## 15-16. Manifest Preparation & Dry-Run
A local, deterministic `pdf_manifest.json` has been successfully generated via a zero-write, zero-B2-API dry-run script. It contains the exact B2 target keys, SHA-256 hashes, and local paths.

### 21-Row PDF Migration Table

| PDF Filename | Size (B) | Target B2 Key | Mapped Resource ID |
|---|---|---|---|
| IMG-20250820-WA0004.pdf | 1197107 | documents/c03fdbaa8e444302f5d3259a9d6742081f0df3790e50498f7431a8f9173f9172/IMG-20250820-WA0004.pdf | **UNMAPPED** |
| 10th-semester-new-course-question-collection-.pdf | 1670240 | documents/6ccc85779cb03ce6948583118741f65f9b45bf46e06646fe562100531a62d895/10th-semester-new-course-question-collection-.pdf | **UNMAPPED** |
| 10th-semester-new-course-question-collection-1-1.pdf | 2767687 | documents/b872c834c2161326d37b39065179d9823b49e957b307aab23e75e9dfcd627ea9/10th-semester-new-course-question-collection-1-1.pdf | **UNMAPPED** |
| 1st-Sem-old-questions-Based-on-new-syllabus-.pdf | 16346177 | documents/6a03a34e433a4ddc8feb33dae1d05354a90035612776c8b1e375fc6ec57ff9b0/1st-Sem-old-questions-Based-on-new-syllabus-.pdf | **UNMAPPED** |
| 2nd-sem-old-questions.pdf | 9161721 | documents/0d1163ca7b58702fc1abce68579cf441e4695eb07f0bb057edc4600e0b3c690f/2nd-sem-old-questions.pdf | **UNMAPPED** |
| 3rd-semester-new-syllabus-question-collection-.pdf | 11179920 | documents/c02f0a1dff5493ed96f0144f84900a307c73b063124508933b91ec08ab6d3e8a/3rd-semester-new-syllabus-question-collection-.pdf | **UNMAPPED** |
| 5th-sem-new-course-question-collection-.pdf | 10333030 | documents/b595ed58e0a2da16694dc506b38c23178c728e752932906b3bc57a9f7e59db94/5th-sem-new-course-question-collection-.pdf | **UNMAPPED** |
| 7th-semester-new-course-questions-collection-.pdf | 9476424 | documents/ab8de642f4c7d0d0f4d30b9d5a083a2166e4a2ec388dc8c3a1d943da78d2dfba/7th-semester-new-course-questions-collection-.pdf | **UNMAPPED** |
| 8th-SYLLBUS.pdf | 132868 | documents/4d84fbb71be399436fcba2ec32c028e93895e7c8582b13b198150af5d21af867/8th-SYLLBUS.pdf | **UNMAPPED** |
| 8th-semester-new-course-question-collection-.pdf | 6151103 | documents/5221980a3a4db2974b245e9976378eec93132cc4bfa9de0e611f71df427e1f40/8th-semester-new-course-question-collection-.pdf | **UNMAPPED** |
| 9th-sem-old-questions.pdf | 9483337 | documents/51cd313bd84f2bdaff777af456f4e15df3ccbeec7eecb8a731efc24e0b04047a/9th-sem-old-questions.pdf | **UNMAPPED** |
| 9th-semester-new-course-question-collection-.pdf | 4464858 | documents/66f64c8d50450ad4197e3a241680517812fcc02e0edda7950c05872195f36ad5/9th-semester-new-course-question-collection-.pdf | **UNMAPPED** |
| BALLB-1st-Semester-Old-Questions.pdf | 16692727 | documents/5cc2595ff945037d2f9baea29ed29cc167bf98c5f6a9e8b7d90e9603be44f53c/BALLB-1st-Semester-Old-Questions.pdf | **UNMAPPED** |
| BALLB-4th-Semester-question-collection-TU.pdf | 9626295 | documents/e08b1a37c4e51141bcbd2dc8894161b947a61d19b4578b668041d8e185e33c64/BALLB-4th-Semester-question-collection-TU.pdf | **UNMAPPED** |
| Eight-semester-new-course-question-collection-.pdf | 5941354 | documents/2a088cdb9308d27ffc6e4e5e7ec4572242ddc9b9829cf9442f4be8ff61fb8b95/Eight-semester-new-course-question-collection-.pdf | **UNMAPPED** |
| fourth-sem-new-course-question-collection-.pdf | 8201846 | documents/7db7d6786c67efed3ed5d2294cd93c20c02c6db7a2ccb9eb97063462ccfd82a9/fourth-sem-new-course-question-collection-.pdf | **UNMAPPED** |
| seventh-semester-new-course-questions-collection-.pdf | 9136900 | documents/755a5b5ff8c26bb9ff1efec91bf97e2f12255c2859d040810be550e1ef0024dd/seventh-semester-new-course-questions-collection-.pdf | **UNMAPPED** |
| sixth-semester-new-course-question-collection-.pdf | 11127471 | documents/7e04f4c2c5ec6cc07af62a5b6ce64da0db734898fc2fb56358db82046ba1ecad/sixth-semester-new-course-question-collection-.pdf | **UNMAPPED** |
| 9th-Sem-final-Moot-Court.pdf | 16085494 | documents/050b1d318e98634892c906649f872dbccda13db4ec81640fc292f7dd0609a067/9th-Sem-final-Moot-Court.pdf | **UNMAPPED** |
| Clinical-Law-II-Conveyancing.pdf | 32374124 | documents/666c5bb9c141753bb4756543edef2928574d30623a6336e7880d4c8dbd98db9c/Clinical-Law-II-Conveyancing.pdf | **UNMAPPED** |
| Moot-Court-Civil-Case-8th-Sem.pdf | 32162249 | documents/9fc9cdb2d713c771b95ffab3af85f265b79af077cd1a97d19da002a281e847be/Moot-Court-Civil-Case-8th-Sem.pdf | **UNMAPPED** |

## Readiness Result
**FAIL** - Because the target `Resource` models do not exist in the database (they were migrated as `Post` objects during Phase 6), the PDF upload cannot safely proceed under the assumption that we are simply attaching PDFs to existing Resources. Phase 7B will require a structural database correction (converting specific Posts to Resources) before the PDFs can be linked.
