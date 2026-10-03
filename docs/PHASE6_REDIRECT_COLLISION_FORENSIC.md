# PHASE 6 REDIRECT COLLISION FORENSIC AUDIT

## 1. Exact Collision Identity
- **Source Record A:** WordPress English Post ID `4356` (Resource: *Rastriya Banijya Bank V Ushadevi Naulakha*)
- **Source Record B:** WordPress English Post ID `4552` (Resource: *Rastriya Banijya Bank V Ushadevi Naulakha*)
- **Locale:** `english`
- **Source Path:** `https://entertainlawyers.com//` (Both generated an empty slug `""` in the legacy export).
- **Deterministic Target UUID (A):** `6ebb1ee5-7620-5dc1-94a2-94ee8b92faaa`
- **Deterministic Target UUID (B):** `282d272e-b390-5791-aebd-7a0063db5766`
- **Resulting Target Paths:** `/resources/<uuid>`

## 2. Collision Classification
**Classification: ERRONEOUS**
The collision is caused by a data anomaly in the legacy WordPress export, where two distinct Case Law posts identically lacked a URL slug (`wordpressSlug: ""`). Because the redirect script builds the source URL using the slug, both distinct records generated the exact same deterministic legacy source identity: `https://entertainlawyers.com//`.

When the importer executed `prisma.redirect.upsert({ where: { source: ... } })`, it successfully created the first redirect, but the second one simply updated the first since the legacy source URLs were perfectly identical, resulting in 210 unique rows instead of 211.

## 3. Migration Identity Verification
The shared `migration-identity.js` logic behaved exactly as engineered:
- **Unique Source Identities:** The UUIDv5 generator successfully produced distinct canonical signatures (`resource:english:4356` vs `resource:english:4552`).
- **No Namespace Collision:** The target UUIDs generated were definitively unique (`6ebb...` vs `282d...`).
- **Prefix / Locale:** Prefixes (`resource:`) and locales (`english`) were correctly concatenated.
- *The bug strictly lies in the legacy source URL formation, not the UUIDv5 cryptographic generation.*

## 4. Recovered Dataset Verification
The collision definitively existed in the original `migration-staging-recovered/redirects.json` dataset. A direct parser scan of that JSON file confirms that both records exist side-by-side specifying `originalUrl: "https://entertainlawyers.com//"`. It was not introduced by the execution script.

## 5. Database State Verification
A full read-only Prisma audit confirmed:
- Exactly 210 `Redirect` rows exist in production.
- 0 duplicate source rows exist.
- 0 review-held redirects entered the database.
- 0 broken redirects exist (all 210 rows were verified to point to a valid, existing `Post` or `Resource`).
- 0 redirects point to the skipped `NEPALI_SAMANYA_SAMACHAR` posts.
- 0 redirects point to unapproved records.

---

**REDIRECT COLLISION:** ERRONEOUS *(Legacy data anomaly)*
**PHASE 6 REDIRECTS:** PASS
**PHASE 6 FULLY CLOSED:** YES
