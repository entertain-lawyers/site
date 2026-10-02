
# WORDPRESS SEMESTER/SUBJECT MAPPING REVIEW (PHASE 2C CONTENT VALIDATION)

## 1. Executive Summary
A strict content-level validation pass was performed on the WordPress categories by extracting and inspecting the actual posts published within them. This pass revealed that many categories cannot be automatically mapped by string similarity alone.

Crucially, the "Precedent" hierarchy is used as a broad classification tag (containing Contract, Evidence, and Family cases) rather than referring to a specific subject like "Civil Procedure".

## 2. Corrections & Validated Mappings

### A. Criminal Law-II (Category 114)
- **Validation:** Representative posts explicitly title themselves "Criminal Law-II Case: [Name]".
- **Result:** Corrected. Maps to **4th Semester / Criminal Law-II**. (Not Criminal Law-I).

### B. Intellectual Property Law (Category 137)
- **Validation:** Representative posts explicitly title themselves "Intellectual Property Law Case: [Name]".
- **Result:** Corrected. Maps to **7th Semester / Intellectual Property Law**. (Not Property Law).

### C. Labour Law (Category 142)
- **Validation:** Representative posts explicitly title themselves "Labour Law Case: [Name]".
- **Result:** Corrected. Maps to **5th Semester / Labor Law** (Spelling variant).

### D. Family Law (Category 122)
- **Validation:** Posts are titled "Family Law Case: [Name]". There is no distinction in the titles or metadata between Family Law-I and Family Law-II.
- **Result:** **MIXED**. Cannot be mapped at the category level. Requires per-resource human review or a fallback to Family Law-I with a warning.

### E. Precedent -> Civil (Category 104)
- **Validation:** Contains posts from "Evidence Law", "Family Law", and "Contract Law". It is a broad grouping.
- **Result:** Subject = **UNRESOLVED**, ResourceType = **CASE_LAW**. Does NOT map to Civil Procedure.

### F. Precedent -> Criminal (Category 105)
- **Validation:** Contains "Evidence Law" and "Criminal Law" cases.
- **Result:** Subject = **UNRESOLVED**, ResourceType = **CASE_LAW**.

### G. Precedent -> Writs (Category 106)
- **Validation:** Contains "Evidence Law", "Contract Law", and "Environment Law" cases.
- **Result:** Subject = **UNRESOLVED**, ResourceType = **CASE_LAW**.

### H. Law of Banking and Negotiable Instruments (Category 139)
- **Validation:** Posts are titled "Banking Law Case: [Name]".
- **Result:** Maps to **7th Semester / Banking and Insurance Law**.

## 3. Unmatched Categories (Human Decision Required)
The following categories contain valid posts (e.g., "Criminology and Penology Case: ...") but **do not exist** in the current Prisma 1st-10th Semester taxonomy. They have been marked UNRESOLVED rather than forced into an Elective.

- Criminology and Penology (Cat 129)
- Election Law (Cat 143)
- Fiscal Law (Cat 150)
- Gender and Inclusive Justice (Cat 151)
- Interpretation of Law (Cat 147)
- Juvenile Delinquency (Cat 128)
- Socio Economic Crime (Cat 146)
- Corporate Law and Management (Cat 149) *(Note: One post mentions "6th semester" in the title, but Corporate Law does not exist in Prisma's 6th Semester).*

## 4. Resource-Level Exceptions
**CATEGORY: Family Law (122)**
- **WP Post 3426:** Family Law Case: Ratna Sambhab Tuladhar v. Sonam
- **WP Post 3540:** Family Law Case: Rabindra Kami v. Tilatma Kami
- **Status:** MIXED. Cannot automatically determine Family Law-I vs. Family Law-II without human classification.

## 5. ResourceType Validations
- Case Law (113) -> `CASE_LAW` (High Confidence)
- Notes (121) -> `LAW_NOTE` (High Confidence)
- Question Paper (126) -> `OLD_QUESTION` (High Confidence)
- Precedent (79) -> `CASE_LAW` (High Confidence, validated via child post titles indicating "Case: ...")
