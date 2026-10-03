# PHASE 6 SOURCE IDENTITY DESIGN

## Objective
To preserve WordPress source identity and provide deterministic idempotency for imported records without modifying the Prisma schema.

## Chosen Identity Mechanism
We will use **UUIDv5 (Deterministic UUID generation based on a namespace and canonical string)**. 
Because Prisma schema natively expects standard UUIDs for `id`, UUIDv5 allows us to pass a pre-computed UUID into `prisma.*.upsert()`. This provides a mathematically guaranteed, collision-free, deterministic primary key derived exclusively from the immutable WordPress source IDs.

### Migration Namespace
We explicitly define a permanent, static UUIDv4 namespace exclusively for the WordPress migration.
**NAMESPACE UUID:** `1b671a64-40d5-491e-99b0-da01ff1f3341`

## Canonical Source String Formats
To prevent collisions between different content types or locales (e.g., an English Post with ID 100 and a Nepali Post with ID 100), we define strict canonical identifier string formats:

- **Posts:** `post:<locale>:<wordpressId>`
  - *Example:* `post:english:2606`
  
- **Resources:** `resource:<locale>:<wordpressId>`
  - *Example:* `resource:nepali:15`
  
- **Documents:** `document:<locale>:<wordpressId>`
  - *Example:* `document:english:2606`

## Algorithm
1. The script encounters WordPress record (e.g., Resource ID 105, site: english).
2. It constructs the canonical string: `"resource:english:105"`.
3. It generates the UUIDv5 hash using the shared migration namespace: `uuidv5("resource:english:105", NAMESPACE)`.
4. The resulting UUID (`e.g., 8f8e02d4-1a3b-5d9c-a810-7e11c5f310f8`) is explicitly passed to `prisma.resource.upsert({ where: { id: generatedUuid } })`.

## Collision Prevention Rules
- Entity type prefixes (`post:`, `resource:`, `document:`) ensure a WordPress post ID and resource ID never collide.
- Locale strings (`english:`, `nepali:`) ensure that multisite exports with identical internal WordPress IDs never collide.
- Capitalization is strictly lowercased for prefixes and locales.

## Note on Source Identity Storage
**UUIDv5 provides deterministic identity derived from source identity.** It guarantees 1:1 consistent mapping, idempotency, and offline redirect generation. However, it does **not** store the plaintext WordPress ID (the hash is one-way). The WordPress ID remains in the migration artifacts and log streams for auditing, which completely satisfies the architectural constraints without needing a new Prisma schema field.
