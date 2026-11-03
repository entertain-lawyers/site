import { prisma } from '@/lib/prisma';
import type { WordPressLanguage } from '@/lib/wordpress';

export interface ResolvedPostAuthor {
  name: string;
  email?: string | null;
  image: string | null;
  bio: string | null;
  website: string | null;
  role?: string | null;
  initials: string;
}

export const DEFAULT_AUTHOR_BIO =
  'Entertain Lawyers is Nepal’s trusted legal news platform, dedicated to delivering unbiased legal updates, court news, and informative content for legal professionals and the general public.';

export const DEFAULT_AUTHOR_BIO_NE =
  'Entertain Lawyers नेपालको एक अग्रणी कानुनी समाचार तथा शैक्षिक प्लेटफर्म हो, जसले कानुनी सचेतना र शिक्षाको विकासमा काम गरिरहेको छ।';

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'EL';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export type PostAuthorInputPost = {
  id: number | string;
  author?: number;
  _embedded?: unknown;
};

export function extractEmbeddedAuthor(embedded: unknown): {
  name?: string;
  description?: string;
  url?: string;
  avatar_urls?: Record<string, string>;
} | undefined {
  if (!embedded || typeof embedded !== 'object') return undefined;
  const authorArray = (embedded as Record<string, unknown>)['author'];
  if (!Array.isArray(authorArray) || authorArray.length === 0) return undefined;
  const first = authorArray[0];
  if (!first || typeof first !== 'object') return undefined;
  return first as {
    name?: string;
    description?: string;
    url?: string;
    avatar_urls?: Record<string, string>;
  };
}

/**
 * Resolves complete author attribution for a WordPress post:
 * 1. Checks explicit local author mapping (User.wpAuthorIdEn / wpAuthorIdNe).
 * 2. Checks AuditLog for authorUserId if the post was created/updated via admin.
 * 3. Checks WordPress embedded author (_embedded['author'][0]).
 * 4. Graceful fallback when no data is available.
 */
export async function resolvePostAuthorForDisplay({
  wpPost,
  lang,
}: {
  wpPost: PostAuthorInputPost;
  lang: WordPressLanguage;
}): Promise<ResolvedPostAuthor> {
  const wpAuthorId = wpPost.author;
  const wpIdStr = String(wpPost.id);

  // 1. Check direct local user mapping
  if (typeof wpAuthorId === 'number' && wpAuthorId > 0) {
    try {
      const localUser = await prisma.user.findFirst({
        where: lang === 'ne' ? { wpAuthorIdNe: wpAuthorId } : { wpAuthorIdEn: wpAuthorId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          website: true,
          role: true,
        },
      });

      if (localUser) {
        const name = (localUser.name || localUser.email || (lang === 'ne' ? 'सम्पादक' : 'Entertain Lawyers')).trim();
        return {
          name,
          email: localUser.email,
          image: localUser.image ?? null,
          bio: localUser.bio || (lang === 'ne' ? DEFAULT_AUTHOR_BIO_NE : DEFAULT_AUTHOR_BIO),
          website: localUser.website ?? null,
          role: localUser.role,
          initials: getInitials(name),
        };
      }
    } catch (err) {
      console.warn('[post-author] error finding local mapped user:', err);
    }
  }

  // 2. Check AuditLog if post was authored by a local user (e.g. unmapped /users/me fallback)
  try {
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'POST_WP',
        entityId: wpIdStr,
        action: { in: ['CREATE', 'UPDATE'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { details: true },
    });

    const details = audit?.details as { authorUserId?: string; authorName?: string } | null;
    if (details?.authorUserId) {
      const auditUser = await prisma.user.findUnique({
        where: { id: details.authorUserId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          website: true,
          role: true,
        },
      });

      if (auditUser) {
        const name = (auditUser.name || auditUser.email || details.authorName || (lang === 'ne' ? 'सम्पादक' : 'Entertain Lawyers')).trim();
        return {
          name,
          email: auditUser.email,
          image: auditUser.image ?? null,
          bio: auditUser.bio || (lang === 'ne' ? DEFAULT_AUTHOR_BIO_NE : DEFAULT_AUTHOR_BIO),
          website: auditUser.website ?? null,
          role: auditUser.role,
          initials: getInitials(name),
        };
      }
    }

    if (details?.authorName && details.authorName.trim()) {
      const name = details.authorName.trim();
      return {
        name,
        email: null,
        image: null,
        bio: lang === 'ne' ? DEFAULT_AUTHOR_BIO_NE : DEFAULT_AUTHOR_BIO,
        website: null,
        role: null,
        initials: getInitials(name),
      };
    }
  } catch (err) {
    console.warn('[post-author] error querying audit log for author:', err);
  }

  // 3. Fallback to WordPress embedded author
  const embedded = extractEmbeddedAuthor(wpPost._embedded);
  if (embedded && embedded.name && embedded.name.trim()) {
    const name = embedded.name.trim();
    const avatar =
      embedded.avatar_urls?.['96'] ||
      embedded.avatar_urls?.['48'] ||
      embedded.avatar_urls?.['24'] ||
      null;
    return {
      name,
      email: null,
      image: avatar,
      bio: embedded.description?.trim() || (lang === 'ne' ? DEFAULT_AUTHOR_BIO_NE : DEFAULT_AUTHOR_BIO),
      website: embedded.url?.trim() || null,
      role: null,
      initials: getInitials(name),
    };
  }

  // 4. Default fallback
  const fallbackName = lang === 'ne' ? 'सम्पादक' : 'Entertain Lawyers';
  return {
    name: fallbackName,
    email: null,
    image: null,
    bio: lang === 'ne' ? DEFAULT_AUTHOR_BIO_NE : DEFAULT_AUTHOR_BIO,
    website: null,
    role: null,
    initials: getInitials(fallbackName),
  };
}

/**
 * Batch resolves author attribution for listing pages and tables,
 * avoiding N+1 queries by loading mapped local authors and audit logs in batch.
 */
export async function batchResolvePostAuthorsForDisplay({
  posts,
  lang,
}: {
  posts: PostAuthorInputPost[];
  lang: WordPressLanguage;
}): Promise<Map<string, ResolvedPostAuthor>> {
  const result = new Map<string, ResolvedPostAuthor>();
  if (posts.length === 0) return result;

  // 1. Fetch all mapped authors from DB once
  let localUsers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    bio: string | null;
    website: string | null;
    role: string;
    wpAuthorIdEn: number | null;
    wpAuthorIdNe: number | null;
  }> = [];

  try {
    localUsers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'EDITOR'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        website: true,
        role: true,
        wpAuthorIdEn: true,
        wpAuthorIdNe: true,
      },
    });
  } catch (err) {
    console.warn('[post-author] batch local user load error:', err);
  }

  const userByWpId = new Map<number, (typeof localUsers)[0]>();
  const userById = new Map<string, (typeof localUsers)[0]>();
  for (const u of localUsers) {
    userById.set(u.id, u);
    const wpId = lang === 'ne' ? u.wpAuthorIdNe : u.wpAuthorIdEn;
    if (wpId) userByWpId.set(wpId, u);
  }

  // Identify which posts are not mapped directly
  const unmappedPostIds: string[] = [];
  for (const p of posts) {
    const postWpAuthorId = p.author;
    if (typeof postWpAuthorId === 'number' && userByWpId.has(postWpAuthorId)) {
      const u = userByWpId.get(postWpAuthorId)!;
      const name = (u.name || u.email || (lang === 'ne' ? 'सम्पादक' : 'Entertain Lawyers')).trim();
      result.set(String(p.id), {
        name,
        email: u.email,
        image: u.image ?? null,
        bio: u.bio || (lang === 'ne' ? DEFAULT_AUTHOR_BIO_NE : DEFAULT_AUTHOR_BIO),
        website: u.website ?? null,
        role: u.role,
        initials: getInitials(name),
      });
    } else {
      unmappedPostIds.push(String(p.id));
    }
  }

  // 2. Batch lookup AuditLog for unmapped posts
  if (unmappedPostIds.length > 0) {
    try {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'POST_WP',
          entityId: { in: unmappedPostIds },
          action: { in: ['CREATE', 'UPDATE'] },
        },
        orderBy: { createdAt: 'desc' },
        select: { entityId: true, details: true },
      });

      const auditByPostId = new Map<string, { authorUserId?: string; authorName?: string }>();
      for (const log of auditLogs) {
        if (!auditByPostId.has(log.entityId)) {
          auditByPostId.set(log.entityId, (log.details as { authorUserId?: string; authorName?: string } | null) ?? {});
        }
      }

      for (const postId of unmappedPostIds) {
        const audit = auditByPostId.get(postId);
        if (audit?.authorUserId && userById.has(audit.authorUserId)) {
          const u = userById.get(audit.authorUserId)!;
          const name = (u.name || u.email || audit.authorName || (lang === 'ne' ? 'सम्पादक' : 'Entertain Lawyers')).trim();
          result.set(postId, {
            name,
            email: u.email,
            image: u.image ?? null,
            bio: u.bio || (lang === 'ne' ? DEFAULT_AUTHOR_BIO_NE : DEFAULT_AUTHOR_BIO),
            website: u.website ?? null,
            role: u.role,
            initials: getInitials(name),
          });
        } else if (audit?.authorName && audit.authorName.trim()) {
          const name = audit.authorName.trim();
          result.set(postId, {
            name,
            email: null,
            image: null,
            bio: lang === 'ne' ? DEFAULT_AUTHOR_BIO_NE : DEFAULT_AUTHOR_BIO,
            website: null,
            role: null,
            initials: getInitials(name),
          });
        }
      }
    } catch (err) {
      console.warn('[post-author] batch audit log lookup error:', err);
    }
  }

  // 3. For any still unresolved posts, check embedded author or fallback
  for (const p of posts) {
    const idStr = String(p.id);
    if (result.has(idStr)) continue;

    const embedded = extractEmbeddedAuthor(p._embedded);
    if (embedded && embedded.name && embedded.name.trim()) {
      const name = embedded.name.trim();
      const avatar =
        embedded.avatar_urls?.['96'] ||
        embedded.avatar_urls?.['48'] ||
        embedded.avatar_urls?.['24'] ||
        null;
      result.set(idStr, {
        name,
        email: null,
        image: avatar,
        bio: embedded.description?.trim() || (lang === 'ne' ? DEFAULT_AUTHOR_BIO_NE : DEFAULT_AUTHOR_BIO),
        website: embedded.url?.trim() || null,
        role: null,
        initials: getInitials(name),
      });
    } else {
      const fallbackName = lang === 'ne' ? 'सम्पादक' : 'Entertain Lawyers';
      result.set(idStr, {
        name: fallbackName,
        email: null,
        image: null,
        bio: lang === 'ne' ? DEFAULT_AUTHOR_BIO_NE : DEFAULT_AUTHOR_BIO,
        website: null,
        role: null,
        initials: getInitials(fallbackName),
      });
    }
  }

  return result;
}
