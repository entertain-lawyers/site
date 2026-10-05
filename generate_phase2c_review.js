const fs = require('fs');

const md = `
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
- Case Law (113) -> \`CASE_LAW\` (High Confidence)
- Notes (121) -> \`LAW_NOTE\` (High Confidence)
- Question Paper (126) -> \`OLD_QUESTION\` (High Confidence)
- Precedent (79) -> \`CASE_LAW\` (High Confidence, validated via child post titles indicating "Case: ...")
`;

const jsonMapping = {
  "resourceTypeMappings": [
    { "wpCategoryId": 113, "prismaResourceType": "CASE_LAW", "confidence": "HIGH" },
    { "wpCategoryId": 121, "prismaResourceType": "LAW_NOTE", "confidence": "HIGH" },
    { "wpCategoryId": 126, "prismaResourceType": "OLD_QUESTION", "confidence": "HIGH" },
    { "wpCategoryId": 79, "prismaResourceType": "CASE_LAW", "confidence": "HIGH" }
  ],
  "subjectMappings": [
    {
      "wpCategoryId": 114,
      "wpCategoryName": "Criminal Law-II",
      "proposedSemester": "4th Semester",
      "proposedSubject": "Criminal Law-II",
      "confidence": "HIGH",
      "reason": "Validated via post titles 'Criminal Law-II Case'",
      "humanDecision": "Approved"
    },
    {
      "wpCategoryId": 137,
      "wpCategoryName": "Intellectual Property Law",
      "proposedSemester": "7th Semester",
      "proposedSubject": "Intellectual Property Law",
      "confidence": "HIGH",
      "reason": "Validated via post titles 'Intellectual Property Law Case'",
      "humanDecision": "Approved"
    },
    {
      "wpCategoryId": 142,
      "wpCategoryName": "Labour Law",
      "proposedSemester": "5th Semester",
      "proposedSubject": "Labor Law",
      "confidence": "HIGH",
      "reason": "Validated via post titles 'Labour Law Case'",
      "humanDecision": "Approved"
    },
    {
      "wpCategoryId": 122,
      "wpCategoryName": "Family Law",
      "proposedSemester": "UNRESOLVED",
      "proposedSubject": "UNRESOLVED",
      "confidence": "LOW",
      "reason": "Category contains generic Family Law posts. Cannot distinguish between Family Law-I and II programmatically.",
      "humanDecision": "Per-resource classification required"
    },
    {
      "wpCategoryId": 104,
      "wpCategoryName": "Civil",
      "proposedSemester": "UNRESOLVED",
      "proposedSubject": "UNRESOLVED",
      "confidence": "HIGH",
      "reason": "Category is a broad tag grouping Contract, Family, and Evidence cases. Does not represent Civil Procedure.",
      "humanDecision": "Leave Subject null, set ResourceType to CASE_LAW"
    },
    {
      "wpCategoryId": 105,
      "wpCategoryName": "Criminal",
      "proposedSemester": "UNRESOLVED",
      "proposedSubject": "UNRESOLVED",
      "confidence": "HIGH",
      "reason": "Category is a broad tag grouping Evidence and Criminal cases.",
      "humanDecision": "Leave Subject null, set ResourceType to CASE_LAW"
    },
    {
      "wpCategoryId": 106,
      "wpCategoryName": "Writs",
      "proposedSemester": "UNRESOLVED",
      "proposedSubject": "UNRESOLVED",
      "confidence": "HIGH",
      "reason": "Category is a broad tag grouping Contract and Environmental cases.",
      "humanDecision": "Leave Subject null, set ResourceType to CASE_LAW"
    },
    {
      "wpCategoryId": 139,
      "wpCategoryName": "Law of Banking and Negotiable Instruments",
      "proposedSemester": "7th Semester",
      "proposedSubject": "Banking and Insurance Law",
      "confidence": "HIGH",
      "reason": "Validated via post titles 'Banking Law Case'",
      "humanDecision": "Approved"
    }
  ],
  "unresolvedCategories": [
    { "wpCategoryId": 129, "name": "Criminology and Penology" },
    { "wpCategoryId": 143, "name": "Election Law" },
    { "wpCategoryId": 150, "name": "Fiscal Law" },
    { "wpCategoryId": 151, "name": "Gender and Inclusive Justice" },
    { "wpCategoryId": 147, "name": "Interpretation of Law" },
    { "wpCategoryId": 128, "name": "Juvenile Delinquency" },
    { "wpCategoryId": 146, "name": "Socio Economic Crime" },
    { "wpCategoryId": 149, "name": "Corporate Law and Management" }
  ]
};

fs.writeFileSync('docs/WORDPRESS_SEMESTER_SUBJECT_MAPPING_REVIEW.md', md);
fs.writeFileSync('docs/wordpress-semester-subject-mapping.review.json', JSON.stringify(jsonMapping, null, 2));

console.log("Phase 2C Validation Documents Generated.");
