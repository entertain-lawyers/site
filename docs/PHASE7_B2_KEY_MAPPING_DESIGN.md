# PHASE 7 B2 KEY MAPPING DESIGN

## 1. Design Requirements
The mapping must be:
- **Deterministic:** The identical source file must consistently generate the identical B2 key.
- **Collision-safe:** Different files identically named `image.jpg` must not overwrite each other.
- **Independent:** Filesystem anomalies (like nested `english/2021/05/` paths) should be abstracted.
- **Identifiable:** The original human-readable filename should be preserved for editorial usability.
- **Compatible:** Must conform to the `PUBLIC_PREFIXES` allowlist in `/api/media/[...key]`.

## 2. Canonical B2 Key Schema

We employ a content-addressed storage (CAS) pattern combined with the original filename. The SHA-256 hash mathematically guarantees collision safety and idempotency, while appending the filename preserves editorial legibility.

### For Public Media (Original Images & Derivatives)
Source Path: `[english|nepali]/wp-content/uploads/YYYY/MM/<filename.ext>`
B2 Key: **`editorial/media/<sha256_hash>/<filename.ext>`**

*Example:* 
`editorial/media/a1b2c3d4e5f6.../supreme-court-verdict.jpg`

### For Private Documents (PDFs)
Source Path: `[english|nepali]/wp-content/uploads/YYYY/MM/<document.pdf>`
B2 Key: **`documents/<sha256_hash>/<document.pdf>`**

*Example:* 
`documents/f9e8d7c6b5a4.../official-gazette.pdf`

## 3. Justification
1. **Idempotency & Reruns:** By prefixing the `sha256` hash, a media migration script can easily execute a `HeadObject` command on B2. If the object exists, it skips uploading. If the migration crashes, it resumes precisely where it left off.
2. **Duplicate Elimination:** The legacy dataset contains 3,793 identical physical duplicates (e.g., the exact same logo uploaded across English and Nepali sites). Because the `sha256` hash forms the key directory, the 3,793 duplicates mathematically collapse into a single upload, vastly optimizing storage.
3. **Collision Safety:** There are 1,160 filename collisions (different images coincidentally named `1.jpg` or `hero.png`). Because the B2 prefix contains their unique `sha256` hash, they will safely exist side-by-side (`editorial/media/hashA/1.jpg` and `editorial/media/hashB/1.jpg`) without corrupting one another.
4. **Security & Routing:** Placing images inside `editorial/` strictly satisfies the `PUBLIC_PREFIXES` array inside `src/app/api/media/[...key]/route.ts`. Placing PDFs inside `documents/` securely bypasses the public route, enforcing the private architectural intent.
