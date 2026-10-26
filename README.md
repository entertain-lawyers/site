# Entertain Lawyers

Entertain Lawyers is a comprehensive educational platform and content management system designed for law students and professionals. It provides structured access to study materials, case laws, legal news, historical facts, and premium resources while offering an extensive editorial backend for content management.

## 2. Project Overview

The platform serves as a modern digital repository for legal education in Nepal and beyond. 

- **Primary Users:** Law students, legal professionals, and platform administrators/editors.
- **Major Capabilities:** Exploring structured law study materials by semester and subject, reading legal news, accessing premium content via entitlements/purchases, and a full CMS.
- **Public Functionality:** Reading news, blogs, historical facts, browsing the study taxonomy, and viewing public FAQs and galleries.
- **Authenticated Functionality:** Purchasing resources, accessing entitled premium documents, profile management, password resets, and email verification.
- **Administrative/CMS Functionality:** Full CRUD capabilities for users, study resources, taxonomy (semesters/subjects/units), editorial posts, advertisements, media uploads, and monitoring audit/access logs.
- **Study Functionality:** Hierarchical taxonomy from Semesters down to Subjects, Units, and specific Resources (documents like PDFs or text notes).

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (16.3.5) App Router |
| Language | TypeScript |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 |
| ORM | Prisma (6.4.1) |
| Database | PostgreSQL (Neon) |
| Authentication | Auth.js (v5 beta) / NextAuth |
| Object Storage | Backblaze B2 |
| Email | Nodemailer |
| Validation | Zod |

## 4. Architecture

The repository is organized to support a scalable Next.js App Router application:

- `src/app/` - Next.js routing, pages, layouts, and API routes. Divided into public routes, authenticated routes (`/profile`, `/dashboard`), and admin boundaries (`/admin`).
- `src/components/` - Reusable React components grouped by feature (e.g., `admin`, `editor`, `home`, `layout`, `posts`, `study`).
- `src/lib/` - Core utilities, including authentication setup (`auth.ts`), mail configurations, and storage adapters (`b2.ts`, `local.ts`).
- `src/modules/` - Domain-driven logic and server actions (e.g., `admin`, `auth`, `documents`, `entitlements`, `user`).
- `prisma/` - Database schema, type definitions, and the migration history.
- `scripts/` - Reusable internal scripts for data migration, media imports, and testing.
- `docs/` - Architectural documentation and audit reports (including WordPress migration plans).

## 5. Application Architecture

- **App Router:** The application exclusively relies on the Next.js App Router (`src/app`).
- **Server/Client Components:** Pages default to React Server Components (RSC) to optimize performance and security. Interactive components (like `ProfileClient.tsx`, `RichTextEditor.tsx`, `AdminSidebar.tsx`) are marked with `"use client"`.
- **Modules & Actions:** Data mutation is handled via Server Actions located in `src/modules/**/*.actions.ts`, securely executing Prisma queries and handling business logic.
- **Authentication Boundaries:** The middleware (`src/middleware.ts`) and Auth.js protect private routes and enforce Role-Based Access Control (RBAC) for `/admin` routes.
- **Data Access Flow:** 
  `UI -> Server Action -> Prisma -> PostgreSQL`
- **Storage Abstraction:** Media and document uploads use a defined interface inside `src/lib/storage`, currently backed by Backblaze B2 (`src/lib/storage/b2.ts`) replacing the previous R2 implementation.

## 6. Feature Overview

### Public Platform
- **Homepage:** Highlights recent news, featured categories, and a global search.
- **Content:** Dedicated pages for `/blogs`, `/news`, and `/historical-facts`.
- **Study Resources:** Hierarchical browsing (`/study`) for law notes, old questions, and case laws.
- **Payment:** Integrated success and failure pages (`/payment/success`, `/payment/failure`) for premium access.

### User Features
- **Auth:** Registration, login, forgot/reset password, and email verification.
- **Profile:** Management of user details and security settings.
- **Entitlements:** Users can purchase and access premium resources (`/read/[resourceId]`).

### Admin/CMS
- **Dashboard:** Overview of platform metrics.
- **Content Management:** Creation and editing of posts, events, publications, FAQs, gallery images, and advertisements using a custom `RichTextEditor`.
- **Study Taxonomy:** Managing Semesters, Subjects, Units, and associating Resources/Documents.
- **Users & Logs:** Managing user roles and monitoring platform access and audit logs.
- **Media Management:** Direct uploading of images and secure PDF documents.

## 7. Study Taxonomy

The study system follows a strict hierarchy defined in the Prisma schema:

```text
Semester
   ↓
Subject
   ↓
Unit
   ↓
Resource
   ↓
Document
```

- **Resource Lifecycle:** Resources can be associated with uploaded Documents. They can be marked as `isPremium` requiring purchase.
- **Ordering:** Semesters, Subjects, and Units support explicit integer ordering (`order` field).
- **Access:** Entitlements map a `User` to a `Resource`, granting access to its associated `Document`. Access is logged via `AccessLog`.

## 8. CMS Architecture

The editorial backend (`/admin`) allows managing varied content:
- **Posts:** Handled via the `Post` model with types (`NEWS`, `BLOG`, `FACT`), supporting statuses and author associations.
- **Media:** Admin forms feature `ImageUpload` capabilities. Documents are handled via an `UploadIntent` lifecycle to ensure clean state management.
- **Permissions:** Only users with `ADMIN` or `EDITOR` roles can access `/admin` routes, verified actively by server actions and layout wrappers.

## 9. Authentication & Authorization

- **Provider:** Auth.js (v5 beta) backed by `@auth/prisma-adapter`.
- **Session Handling:** Database-backed sessions.
- **Protection:** Next.js middleware (`src/middleware.ts`) intercepts requests to enforce login requirements for protected areas.
- **Email Verification & Password Resets:** Custom flows leveraging Nodemailer to send secure, time-bound tokens.

## 10. Storage Architecture

**Current Implementation:** Backblaze B2 (`src/lib/storage/b2.ts`)  
*(Note: The project previously used Cloudflare R2. All R2 implementations have been removed in favor of B2).*

- **Interface:** Uploads are streamed securely using the AWS SDK S3 client compatible with B2.
- **Public Assets:** General images (gallery, posts) are uploaded to a public bucket.
- **Private Documents:** Premium PDFs and study notes are securely signed and accessed only via application-level entitlement verification (`src/app/api/media/[...key]`).
- **Upload Flow:** The CMS uses an `UploadIntent` model for large resources, allowing secure presigned uploads and strict rollback capabilities if a file fails to upload.

## 11. Database & Prisma

- **Database:** PostgreSQL (Hosted on Neon).
- **ORM:** Prisma Client.
- **Schema:** `prisma/schema.prisma`
- **Migrations:** Managed in `prisma/migrations/`.

### Known Database / Migration Note
> **WARNING:** The repository contains existing Prisma migration history. However, there is a **known Neon migration-state issue** regarding deployment drift. Do **NOT** casually run `prisma migrate reset` or `prisma db push` against the production database, as this can result in catastrophic data loss or migration corruption. Any modifications to the schema must be carefully audited against the live Neon instance first.

## 12. Environment Variables

Variables should be configured in `.env.local`. Refer to `.env.example`:

| Variable | Purpose | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | Prisma DB connection | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Direct DB connection | Yes | Used for migrations |
| `AUTH_SECRET` | Auth.js encryption | Yes | Must be a strong random string in prod |
| `R2_*` | Storage config | Yes | *Historically named R2, currently points to B2* |
| `ESEWA_*` | Payment gateway | No | Used for local checkout testing |
| `KHALTI_*` | Payment gateway | No | Used for local checkout testing |

**Never place actual credentials in this README or commit them to source control.**

## 13. Local Development Setup

### Prerequisites
- Node.js (v20+)
- npm
- A local or remote PostgreSQL database

### Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/entertain-lawyers/site.git
   cd site
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment:**
   Copy `.env.example` to `.env.local` and fill in your development database and storage keys.
4. **Database:**
   If working locally, run standard migrations safely:
   ```bash
   npx prisma migrate dev
   ```
5. **Run Development Server:**
   ```bash
   npm run dev
   ```

### Build & Lint
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Next.js version:** keep `next` at **16.4.3 or newer**. Earlier 16.3.x Turbopack builds can fail on Google Fonts' intermittent extensionless `/l/font?kit=…` URLs (`next/font/google queries have exactly one entry`). 16.4.3 resolves the type from the CSS `format()` hint and percent-encodes the font query.

## 14. Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build the Next.js production app |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run ai:index` | Rebuild the Kanun Saathi AI index (`-- --reset`, `-- --only=team`) |

### AI Assistant (Kanun Saathi)

The floating chatbot is a grounded RAG assistant, not a fine-tuned model. It answers from:

- a **deterministic site-facts layer** (team profiles, contact details, services, pricing, billing,
  downloads, privacy, navigation, semester subjects and follow-up questions, answered directly
  from the database in English or Nepali), and
- a **vector index** of site pages, team profiles, FAQs, plans, semesters, study resources,
  posts, publications, events and WordPress content, with hybrid title/name retrieval and a
  relevance gate so unrelated pages are never cited.

Legal answers stay grounded: if a topic is not in the index, the assistant says so instead of
answering from the model's general knowledge.

Rebuild the index from **Admin → System → AI Index** (`/admin/ai`) or with `npm run ai:index`.
Full details, content sources and testing questions: [`docs/AI_KNOWLEDGE_BASE.md`](docs/AI_KNOWLEDGE_BASE.md).

**Internal Migration Scripts (`scripts/`):**
- `migration.js` / `migration-media.js` / `migration-redirects.js` / `migration-report.js`: Tooling built to migrate legacy WordPress data into the new Prisma schema.
- `smoke-test-b2.js` / `verify-gate.js`: Utilities to test storage connections and data integrity.

## 15. Database Migration Rules

- **Never manually edit an already-applied production migration.**
- **Never delete migration history (`prisma/migrations/`).**
- **Do not reset production databases.**
- **Review migration SQL carefully** before applying.
- **Understand the existing Neon migration issue** before pushing new schema changes.

## 16. WordPress Migration

The platform originated from a WordPress installation.
- The repository contains migration tooling under `scripts/`.
- Extensive documentation on the migration logic resides in `docs/`.
- **Excluded Artifacts:** Highly sensitive WordPress SQL dumps, `.json` exports, and `migration-staging/` artifacts are explicitly excluded via `.gitignore`.
- **DO NOT** attempt to commit these temporary extraction files to Git.

## 17. Security Rules

- **Never commit `.env`, `.env.local`, or `temp.env`.**
- **Never commit credentials, passwords, or authentication secrets.**
- **Never commit B2 access keys or payment gateway secrets.**
- **Never commit migration source exports.**
- All user uploads must be validated for MIME type and file size.
- Maintain strict authorization checks in server actions and API routes.

## 18. Deployment

The application is optimized for deployment on Vercel.
- Configure all production environment variables securely in the Vercel dashboard.
- The build command is natively detected as `next build`.
- Ensure the production Neon database connection string is properly configured with connection pooling (`?pgbouncer=true` or equivalent if required).
- Vercel automatically runs `prisma generate` post-install.

## 19. Production Checklist

- [ ] Environment variables configured in deployment dashboard.
- [ ] Neon PostgreSQL database configured and accessible.
- [ ] Backblaze B2 buckets configured (public & private) with CORS rules.
- [ ] `AUTH_SECRET` generated and secured.
- [ ] Payment gateway keys verified (eSewa/Khalti).
- [ ] Build succeeds without ESLint or TypeScript errors.
- [ ] Neon migration state verified manually before deployment.
- [ ] Admin authentication and CMS access verified.
- [ ] Secrets and `.env` files remain strictly excluded from the Git repository.

## 20. Development Workflow

1. Create a feature branch (`git checkout -b feature/name`).
2. Develop and test locally.
3. Run `npm run lint` and `npm run build` to verify integrity.
4. Verify no secrets or sensitive files are staged.
5. Commit with descriptive messages.
6. Open a Pull Request for code review.
7. Deploy to staging, verify database changes, and merge.

## 21. Troubleshooting

- **Prisma Connection Failures:** Verify `DATABASE_URL` matches your local/remote PostgreSQL instance and ensure IP allowlisting is configured if using Neon.
- **B2 Upload Problems:** Ensure CORS is configured on the B2 bucket. Verify `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are valid application keys with write access.
- **Authentication Fails:** Verify `AUTH_SECRET` is set in your environment. If running locally, ensure NextAuth URLs are correctly inferring `localhost:3000`.

## 22. Repository Hygiene

The following items are intentionally excluded from version control (enforced by `.gitignore`):
- Environment files (`.env`, `.env.local`, `temp.env`).
- Build outputs (`.next/`, `dist/`).
- Package dependencies (`node_modules/`).
- WordPress migration archives, JSON dumps, and staging folders.
- Local scratch scripts and temporary SQL diffs.

## 23. Contributing

- Keep branches organized and descriptive.
- Perform thorough local testing before submitting code.
- Ensure all Server Actions properly enforce authorization (role checks).
- Respect the architectural boundaries between Public, Authenticated, and Admin routes.

## 24. Maintainer Notes

This repository contains the established production codebase.
- **Migrations:** Be extremely cautious with Prisma migrations due to the known Neon state drift.
- **Storage:** The Backblaze B2 migration is complete. Ensure any new media integrations use the `src/lib/storage` abstractions.
- **Access Control:** Do not bypass `entitlement.service.ts` when serving premium resources.

## 25. License

*(Licensing information is not currently specified in this repository.)*
