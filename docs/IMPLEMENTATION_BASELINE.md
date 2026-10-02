# IMPLEMENTATION BASELINE

## Architecture Overview
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Prisma with PostgreSQL
- Cloudflare R2 for secure document storage
- `next-auth` for session management
- Distinct routing structure supporting root English and `/nepali/*` localization

## Protected Systems (DO NOT BREAK)
1. **Authentication:** Auth.js session handling across edge middleware and server actions.
2. **RBAC:** Admin vs Editor vs User authorization boundaries.
3. **Monetization Engine:** Subscriptions, Purchases, and the Entitlements mapping.
4. **Payment Integrations:** eSewa and Khalti initiation and webhook callbacks.
5. **Secure PDF Delivery:** Access validation and signed URL generation via R2.

## Current Missing Functionality & Gaps
- **Study Taxonomy:** Semesters, Subjects, and Units exist in the schema but have NO admin/editor UI.
- **Editorial Models:** Events, Publications, Gallery, FAQs, Site Settings, Redirects do not exist in the schema.
- **Database Cascades:** Deletions are currently handled via manual application-level queries (e.g. `deleteMany` for Entitlements), risking race conditions.
- **SEO/Metadata:** Hardcoded values; missing CMS fields for Meta titles and descriptions.

## Baseline Database Status
- Extensively relational with strong `Resource` ties.
- Uses minor units (paisa) for all currency storage.

## Deployment Assumptions
- Node >= 20.x environment.
- Server Actions for mutations.
- Heavy reliance on Next.js `revalidatePath` for caching resets.
