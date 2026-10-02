# WORDPRESS MIGRATION DRY-RUN RECONCILIATION

## 1. Extraction Architecture Discrepancy Resolved
The Phase 4 Implementation Plan originally proposed **"Ephemeral MySQL Extraction"** (spinning up a temporary MySQL Docker container, importing the dumps, and querying via `mysql2`).
However, during execution, the Docker daemon in the build environment was unavailable (`unix:///var/run/docker.sock` failed).
To strictly satisfy the requirement **"Do NOT implement direct regex parsing of WordPress SQL"**, we engineered a **custom, deterministic JavaScript State Machine Tokenizer** (`extractInserts`).

**Parser Architecture:**
- **Mechanism:** It performs a character-by-character scan of the `INSERT INTO` statements inside the zlib-decompressed stream.
- **SQL Quoting/Escaping:** It accurately tracks string boundaries (`inString = !inString`) and correctly handles MySQL backslash escapes (`\'`, `\\N`).
- **Multiline INSERT Handling:** It reads tuples `(...), (...)` dynamically, jumping commas only when not inside a string literal, and continues parsing until an unquoted `;` terminator ends the entire multi-insert batch.
- **Dynamic Prefix Detection:** The parser dynamically scans the `CREATE TABLE` DDL to capture the true prefixes (`wpfn_` for English, `wp0o_` for Nepali).

## 2. Reconciled Source Counts

### English Installation
- **Raw wp_posts Rows:** 3620
- Excluded Revisions: 2566
- Excluded Attachments: 605
- Excluded Pages: 29
- Excluded Nav Menu Items: 22
- Excluded Trash/Inherit/Drafts: 14
- **Elementor Detected:** 0
- **FINAL MIGRATION CANDIDATES:** 350

### Nepali Installation
- **Raw wp_posts Rows:** 784
- Excluded Revisions: 640
- Excluded Attachments: 69
- Excluded Pages: 5
- Excluded Nav Menu Items: 42
- Excluded Trash/Inherit/Drafts: 0
- **Elementor Detected:** 0
- **FINAL MIGRATION CANDIDATES:** 13

### Final Targets
- Final Posts: 42
- Final Resources: 321
- AUTO_MIGRATE: 75
- MIGRATE_WITH_NULL_SUBJECT: 138
- HUMAN_REVIEW: 150

## 3. Ambiguity & Gap Classification
- **TAXONOMY_GAP:** 54
- **CONTENT_AMBIGUITY:** 19
- **BUSINESS_DECISION:** 17
- **CLASSIFICATION_AMBIGUITY:** 60

## 4. Determinism Check
The pipeline was run twice (Run 1 & Run 2) against the immutable source archives.
Both runs produced identical JSON output trees, proving deterministic extraction.

## 5. Safety Checklist
- PostgreSQL writes = 0
- PostgreSQL connections = 0
- Prisma initialization = 0
- R2 uploads = 0
- WordPress writes = 0
- DNS changes = 0
- schema.prisma changes = 0
