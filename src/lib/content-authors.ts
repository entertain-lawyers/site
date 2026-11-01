import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { UserFacingError } from '@/lib/safe-action';
import { listWordPressAuthors, type WordPressAuthor, type WordPressLanguage } from '@/lib/wordpress';

/**
 * Who may be credited as a content author. The app has no separate AUTHOR
 * role, so administrators and editors are the eligible content authors.
 */
export const CONTENT_AUTHOR_ROLES: Role[] = [Role.ADMIN, Role.EDITOR];

export interface AuthorOption {
  id: string;
  name: string;
  role: Role;
  /** Explicit link to each WordPress install's user id; null when not linked. */
  wpAuthorIdEn: number | null;
  wpAuthorIdNe: number | null;
}

export function authorDisplayName(user: {
  name?: string | null;
  email?: string | null;
}): string {
  return (user.name || user.email || 'Unnamed user').trim();
}

export function isContentAuthorRole(role: Role): boolean {
  return CONTENT_AUTHOR_ROLES.includes(role);
}

/** Eligible local users for the author dropdowns. */
export async function listLocalAuthors(): Promise<AuthorOption[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: CONTENT_AUTHOR_ROLES } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      wpAuthorIdEn: true,
      wpAuthorIdNe: true,
    },
    orderBy: { name: 'asc' },
  });

  return users.map((user) => ({
    id: user.id,
    name: authorDisplayName(user),
    role: user.role,
    wpAuthorIdEn: user.wpAuthorIdEn,
    wpAuthorIdNe: user.wpAuthorIdNe,
  }));
}

/**
 * Validates an author picked in the UI. Enforced server-side so a forged
 * request cannot credit a normal user (or a non-user) as the author.
 */
export async function resolveLocalAuthor(authorUserId: string): Promise<AuthorOption> {
  const user = await prisma.user.findUnique({
    where: { id: authorUserId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      wpAuthorIdEn: true,
      wpAuthorIdNe: true,
    },
  });

  if (!user) {
    throw new UserFacingError('The selected author account no longer exists.');
  }
  if (!isContentAuthorRole(user.role)) {
    throw new UserFacingError('Only administrators and editors can be assigned as content authors.');
  }

  return {
    id: user.id,
    name: authorDisplayName(user),
    role: user.role,
    wpAuthorIdEn: user.wpAuthorIdEn,
    wpAuthorIdNe: user.wpAuthorIdNe,
  };
}

/**
 * Maps a local author to the WordPress user id for one install. WordPress ids
 * are never derived from local ids or names: without an explicit link the save
 * is refused rather than crediting the wrong person.
 */
export async function resolveWordPressAuthor(
  authorUserId: string,
  lang: WordPressLanguage
): Promise<{ author: AuthorOption; wpAuthorId: number }> {
  const author = await resolveLocalAuthor(authorUserId);
  const wpAuthorId = lang === 'ne' ? author.wpAuthorIdNe : author.wpAuthorIdEn;

  if (!wpAuthorId) {
    const siteLabel = lang === 'ne' ? 'a Nepali' : 'an English';
    throw new UserFacingError(
      `${author.name} is not linked to ${siteLabel} WordPress author account. Link them in Admin → Users, or choose a linked author.`
    );
  }

  return { author, wpAuthorId };
}

/** WordPress author list plus a readable error for the mapping screen. */
export async function listWordPressAuthorsSafe(
  lang: WordPressLanguage
): Promise<{ authors: WordPressAuthor[]; error: string | null }> {
  try {
    return { authors: await listWordPressAuthors(lang), error: null };
  } catch (error) {
    console.error(`[content-authors] could not list ${lang} WordPress authors`, error);
    return {
      authors: [],
      error:
        lang === 'ne'
          ? 'Nepali WordPress author accounts could not be loaded. Check the Nepali WordPress URL and credentials.'
          : 'WordPress author accounts could not be loaded. Check the WordPress URL and credentials.',
    };
  }
}
