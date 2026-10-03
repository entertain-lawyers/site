# Phase 8A: Site Parity & UX Audit

## 1. Full Site Inventory
| Area | Old Site Count | New Site Count | Status | Severity | Evidence | Required Fix |
|------|----------------|----------------|--------|----------|----------|--------------|
| Total Posts (News/Blogs/Facts) | 321 | 73 | MISSING | CRITICAL | WP-JSON returned 321 posts, Prisma DB has 73. Migrations dropped or converted many posts to Resources. | Need to identify missing text-only posts (not PDFs) and remigrate them if they were dropped erroneously. |
| Total Pages | 29 | ~10 (static) | MISSING | MEDIUM | WP-JSON returned 29 pages. | Port remaining required WP pages (Privacy Policy, Terms, About, etc.) into Next.js static or dynamic routes. |
| Total Media (Images/PDFs) | 633 | 6,599 (variations) | MATCHED | INFORMATIONAL | B2 bucket contains all variations representing the 633 original items. | None. |
| Study Resources | N/A | 156 | MATCHED | INFORMATIONAL | The migration cleanly converted PDF posts to distinct Resources. | None. |

## 2. Blogs + News Architecture
| Area | Old Site | New Site | Status | Severity | Evidence | Required Fix |
|------|----------|----------|--------|----------|----------|--------------|
| News vs Blog Routing | Distinct categories | `/news` & `/blogs` routes | MISPLACED | HIGH | News and Blogs share the `Post` schema but rely on `PostType` enum filtering. | Ensure `type` enum correctly maps Old WordPress categories (e.g., category ID 58 -> NEWS) rather than lumping them together. |
| Nepali Categories | Present | Missing in Prisma | MISSING | CRITICAL | Schema compilation fails on Nepali PostTypes. | Add Nepali enums (`NEPALI_SAMANYA_SAMACHAR`, etc.) to Prisma `PostType`. |

## 3. Media & File Parity
| Area | Old Site | New Site | Status | Severity | Evidence | Required Fix |
|------|----------|----------|--------|----------|----------|--------------|
| Private PDFs | Public / `wp-content` | Private B2 Bucket | MATCHED | INFORMATIONAL | `api/media/[...key]` correctly blocks `/documents/` route. | None (Working as intended). |
| Image Rendering | Visible | Needs verification | UNVERIFIED | HIGH | Migration uploaded them, but UI components might have missing `alt` or `width/height` attributes. | Test live rendering of rich-text content for broken B2 links. |

## 4. PDF Placement & Conflict Resolution
| Area | Old Site | New Site | Status | Severity | Evidence | Required Fix |
|------|----------|----------|--------|----------|----------|--------------|
| WP ID 3907 Conflict | 1 Post, 2 PDFs | 2 distinct Resources | MATCHED | INFORMATIONAL | `e2a93f0d` (Old Course) and `1cbfe25a` (New Course) exist correctly in DB with distinct Documents. | None. |

## 5. Navigation & Dropdowns
| Area | Old Site | New Site | Status | Severity | Evidence | Required Fix |
|------|----------|----------|--------|----------|----------|--------------|
| Desktop Hover Menu | Click/Hover | Pure CSS Hover | MISPLACED | HIGH | `Navbar.tsx` uses `group-hover`. No Escape key, no keyboard tabbing, stuck hover states. | Rebuild Desktop Dropdown using headless UI or React state for proper accessibility (a11y) and click-outside handling. |
| Mobile Navigation | Hamburger | `<details>` tag | UNVERIFIED | MEDIUM | `MobileMenu.tsx` has correct scroll locking but `<details>` tag can cause clipping on small screens. | Audit mobile accordion behavior for overflow clipping on 320px screens. |

## 6. URL & Redirect Parity
| Area | Old Site | New Site | Status | Severity | Evidence | Required Fix |
|------|----------|----------|--------|----------|----------|--------------|
| Legacy Redirects | Live | 210 in DB | MATCHED | INFORMATIONAL | Prisma DB holds 210 redirects from old slugs. | Map Next.js middleware or `next.config.ts` to actively consume these `Redirect` records. |

## 7. English / Nepali & Footer
| Area | Old Site | New Site | Status | Severity | Evidence | Required Fix |
|------|----------|----------|--------|----------|----------|--------------|
| Language Switcher | Subdirectory/Plugin | `NEXT_LOCALE` Cookie | MATCHED | INFORMATIONAL | Middleware correctly forces `/nepali` route checks. | None. |
| Footer Links | Rich footer | Hardcoded | MISSING | MEDIUM | `Footer.tsx` has hardcoded "Researchers" and standard links. | Ensure all legacy Legal, About, and Social links are matched. |

## 8. Search, Filtering, and Content Rendering
| Area | Old Site | New Site | Status | Severity | Evidence | Required Fix |
|------|----------|----------|--------|----------|----------|--------------|
| Global Search | Present | Missing | MISSING | HIGH | No `<Search />` component found globally. | Implement site-wide search for Posts and Resources. |
| Content Rendering | Elementor/Raw HTML | `dangerouslySetInnerHTML` | MISPLACED | HIGH | Frontend attempts to render `resource.content` but schema drift removed it. | Decide whether to restore `content` to Resource or strip it from the UI. |

---

## Prioritized Remediation Plan

**Priority 1: Resolve Schema/Application Drift (CRITICAL)**
- Address the 60 TS errors preventing build: Add missing `User` fields, `Advertisement` model, `Resource.content/authorId`, and `PostType` enums.

**Priority 2: Content Migration Gap (CRITICAL)**
- Investigate the missing ~248 old posts and ~19 old pages. Run a targeted re-extraction of text-only posts (News/Blog/Opinion) from the WP SQL dump and seed them into Neon.

**Priority 3: Navigation UX Rewrite (HIGH)**
- Refactor `Navbar.tsx` desktop dropdowns from pure CSS hover to React state-managed components (with Escape key support, click-outside, and keyboard focus).

**Priority 4: Information Architecture Fixes (HIGH)**
- Fix the separation of Blogs and News in the Next.js frontend to match the exact categories they had in WordPress, rather than arbitrary date-based splitting.
- Build a Global Search interface.

**Priority 5: Page/Footer Parity (MEDIUM)**
- Manually port missing static pages (Terms, Privacy, About) and update the hardcoded `Footer.tsx`.
