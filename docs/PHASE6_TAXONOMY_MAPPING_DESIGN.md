# PHASE 6 TAXONOMY MAPPING DESIGN

## Objective
To map the 136 semantic taxonomy strings derived during Phase 5 classification to deterministic, authoritative UUIDs in the production Neon database.

## Background
The recovered `resources.json` contains `subjectId` references that correspond to randomly generated UUIDs from a local development database. Inserting these into Neon will fail via foreign-key constraint violations because Neon's taxonomy is currently empty.

## Strategic Approach
Instead of blindly mapping arbitrary strings, we will use the same **UUIDv5 Deterministic Generation** logic to seed the Neon taxonomy and construct the foreign keys. This guarantees that `resources.json` can map to Neon `Subject` records flawlessly without requiring a pre-import query or cross-database synchronization.

### Canonical Identifiers
We define strict canonical identity strings for the taxonomies, ignoring whitespace variations or capitalization differences. The same static Namespace UUID (`1b671a64-40d5-491e-99b0-da01ff1f3341`) will be used.

**Semesters:**
Format: `semester:<canonical-semester-name>`
- *Example:* `semester:first-semester`
- *Example:* `semester:second-semester`

**Subjects:**
Format: `subject:<canonical-semester-name>:<canonical-subject-name>`
- *Example:* `subject:first-semester:constitutional-law`
- *Example:* `subject:second-semester:criminal-law`

**Units (if implemented later):**
Format: `unit:<canonical-semester-name>:<canonical-subject-name>:<canonical-unit-name>`
- *Example:* `unit:first-semester:constitutional-law:unit-1`

### Normalization Rules
Before generating the UUIDv5, the taxonomy names must be normalized:
- Lowercased
- Spaces converted to hyphens
- Extraneous punctuation removed

### Processing Rules
1. **Preserving Verified Records:** The 11 `APPROVED_EXISTING_SUBJECT` semantic decisions from the Phase 5 policy will be mapped to their UUIDv5 counterparts seamlessly.
2. **NULL_SUBJECT_CANDIDATE:** The 125 intentionally `NULL` subjects will remain as `subjectId: null` on the imported `Resource` records, exactly as intended by the verified Phase 5 policy. 
3. **Review Isolation:** The 152 records categorized as `NEEDS_BUSINESS_DECISION` and `NEW_SUBJECT_REQUIRED` will remain completely excluded from the automatic import pipeline. They will NOT be mapped to fabricated taxonomies.
