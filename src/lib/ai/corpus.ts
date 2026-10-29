import { prisma } from '@/lib/prisma';
import {
  getWordPressPosts,
  mapCategoryToType,
  decodeHtmlEntities,
  WordPressLanguage,
} from '@/lib/wordpress';
import { SITE_KNOWLEDGE } from './site-knowledge';

/**
 * Builds the corpus embedded into the AI index.
 *
 * One place, every content source:
 *   • hand-written site knowledge (about, contact, navigation, pricing…)
 *   • team members (full profiles, so "who is X?" gets every detail)
 *   • FAQs and active subscription plans
 *   • semester/subject taxonomy
 *   • resources, publications, events and CMS posts
 *   • WordPress posts (English + Nepali)
 *
 * The `/api/ai/search-index` route and any ops tooling share this module, so a
 * single ingestion run covers the whole site.
 */

export interface CorpusItem {
  source: string;
  refId: string;
  title: string;
  meta: string | null;
  url: string;
  category: string;
  lang: string;
  summary: string;
  text: string;
}

export interface TeamMemberLike {
  name: string;
  slug: string;
  designation: string;
  shortBio?: string | null;
  biography?: string | null;
  imageUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  qualifications?: string | null;
  experience?: string | null;
  achievements?: string | null;
  practiceAreas?: string | null;
  languages?: string | null;
  displayOrder?: number;
  isPublished?: boolean;
}

function stripHtml(raw: string | undefined | null): string {
  if (!raw) return '';
  return decodeHtmlEntities(raw.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function wpUrl(type: string, id: number): string {
  if (type.startsWith('NEPALI')) return `/nepali/post/${id}`;
  if (type === 'BLOG') return `/blogs/${id}`;
  if (type === 'NEWS') return `/news/${id}`;
  if (type === 'FACT' || type === 'PERSONALITY') return `/historical-facts/${id}`;
  return `/blogs/${id}`;
}

function postUrl(type: string, id: string): string {
  if (type.startsWith('NEPALI')) return `/nepali/post/${id}`;
  if (type === 'NEWS') return `/news/${id}`;
  if (type === 'FACT') return `/historical-facts/${id}`;
  return `/blogs/${id}`;
}

/** Multi-line list fields (achievements etc.) read better as "• item" lines. */
export function listify(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const items = value
    .split(/\r?\n|,(?=\s*[A-Z])/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  return items.map((item) => `• ${item}`).join('\n');
}

/** Full, human-readable profile text used for embedding AND retrieval. */
export function teamMemberText(member: TeamMemberLike): string {
  const lines = [
    `${member.name} — ${member.designation} at Entertain Lawyers.`,
    `Profile: /team/${member.slug}`,
    member.shortBio ? `Short bio: ${member.shortBio}` : '',
    member.biography ? `Biography: ${member.biography}` : '',
    member.qualifications ? `Academic details / qualifications: ${member.qualifications}` : '',
    member.experience ? `Experience: ${member.experience}` : '',
    member.achievements ? `Achievements: ${member.achievements}` : '',
    member.practiceAreas ? `Practice areas / interests: ${member.practiceAreas}` : '',
    member.languages ? `Languages: ${member.languages}` : '',
    member.email ? `Email: ${member.email}` : '',
    member.phone ? `Phone: ${member.phone}` : '',
    member.linkedinUrl ? `LinkedIn: ${member.linkedinUrl}` : '',
    member.facebookUrl ? `Facebook: ${member.facebookUrl}` : '',
    member.instagramUrl ? `Instagram: ${member.instagramUrl}` : '',
    member.websiteUrl ? `Website: ${member.websiteUrl}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

/** Roster line used in the "Our Team" overview doc. */
export function teamRosterLine(member: TeamMemberLike): string {
  return `${member.name} — ${member.designation} (profile: /team/${member.slug})`;
}

function personCategory(): string {
  return 'team';
}

export async function buildCorpus(): Promise<CorpusItem[]> {
  const corpus: CorpusItem[] = [];

  // 1) Site knowledge (always first: stable refIds, small and high-value).
  for (const doc of SITE_KNOWLEDGE) {
    corpus.push({ source: 'site', ...doc });
  }

  const [team, faqs, plans, semesters, posts, resources, publications, events] = await Promise.allSettled([
    prisma.teamMember.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.fAQ.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { order: 'asc' },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceAmount: 'asc' },
    }),
    prisma.semester.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        order: true,
        subjects: { select: { name: true, order: true }, orderBy: { order: 'asc' } },
      },
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, content: true, type: true, metaDesc: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        type: true,
        isPremium: true,
        priceAmount: true,
        currency: true,
        subject: { select: { name: true } },
        unit: { select: { name: true } },
        semester: { select: { name: true } },
      },
      orderBy: [{ subject: { order: 'asc' } }, { title: 'asc' }],
      take: 800,
    }),
    prisma.publication.findMany({
      where: { status: 'PUBLISHED', publishDate: { lte: new Date() } },
      select: { id: true, title: true, slug: true, description: true },
      orderBy: { publishDate: 'desc' },
      take: 300,
    }),
    prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, slug: true, description: true, eventDate: true, location: true },
      orderBy: { eventDate: 'desc' },
      take: 200,
    }),
  ]);

  // 2) Team members — full profiles. This is what makes "Who is Ram Babu Das?"
  //    return every detail instead of a generic page.
  if (team.status === 'fulfilled' && team.value.length) {
    const members = team.value;
    const roster = members.map(teamRosterLine).join('\n');
    corpus.push({
      source: 'site',
      refId: 'site-team-members',
      title: 'Our Team — Members, Designations and Profiles',
      meta: `${members.length} published members`,
      url: '/team',
      category: 'site-team',
      lang: 'en',
      summary: `Entertain Lawyers team members:\n${roster}\nAsk about any member by name to get their full profile, qualifications, experience, achievements, practice areas and contact links.`,
      text: `Entertain Lawyers team. ${members.map(teamMemberText).join('\n\n')}`,
    });

    for (const member of members) {
      const text = teamMemberText(member);
      corpus.push({
        source: 'team',
        refId: member.id,
        title: member.name,
        meta: member.designation,
        url: `/team/${member.slug}`,
        category: personCategory(),
        lang: 'en',
        summary: text,
        text,
      });
    }
  }

  // 3) FAQs (empty today, populated by admins later).
  if (faqs.status === 'fulfilled') {
    for (const faq of faqs.value) {
      const answer = stripHtml(faq.answer);
      if (!faq.question?.trim() || !answer) continue;
      corpus.push({
        source: 'faq',
        refId: faq.id,
        title: faq.question.trim(),
        meta: faq.language,
        url: '/faqs',
        category: 'faq',
        lang: faq.language || 'en',
        summary: `Q: ${faq.question.trim()}\nA: ${answer}`,
        text: `Question: ${faq.question.trim()}\nAnswer: ${answer}`,
      });
    }
  }

  // 4) Active subscription plans.
  if (plans.status === 'fulfilled') {
    for (const plan of plans.value) {
      const price = `NPR ${(plan.priceAmount / 100).toFixed(0)}`;
      corpus.push({
        source: 'plan',
        refId: plan.id,
        title: `${plan.name} — ${price} for ${plan.durationDays} days`,
        meta: price,
        url: '/pricing',
        category: 'site-pricing',
        lang: 'en',
        summary: `${plan.name}: ${price} for ${plan.durationDays} days (${plan.currency}). Unlocks all premium resources, the secure PDF viewer, materials for all semesters, regular updates, priority support and an ad-free reading experience. One-time, non-recurring charge with no hidden fees.`,
        text: `Subscription plan ${plan.name}. Price ${price}. Duration ${plan.durationDays} days. Currency ${plan.currency}. Unlocks all premium study resources and the secure reader.`,
      });
    }
  }

  // 5) Semester → subject taxonomy, one doc per semester.
  if (semesters.status === 'fulfilled') {
    for (const semester of semesters.value) {
      const subjects = semester.subjects.map((s) => s.name);
      if (!subjects.length) continue;
      const names = subjects.join(', ');
      corpus.push({
        source: 'semester',
        refId: semester.id,
        title: `${semester.name} — Subjects`,
        meta: `${subjects.length} subjects`,
        url: `/semesters/${semester.id}`,
        category: 'site-study',
        lang: 'en',
        summary: `${semester.name} at Entertain Lawyers covers ${subjects.length} subjects: ${names}. Open /semesters/${semester.id} to browse the units and resources for each subject.`,
        text: `${semester.name}. Subjects: ${names}.`,
      });
    }
  }

  // 6) Study resources.
  if (resources.status === 'fulfilled') {
    for (const r of resources.value) {
      const parts = [r.semester?.name, r.subject?.name, r.unit?.name].filter(Boolean);
      const meta = parts.length ? parts.join(' — ') : String(r.type);
      const pricing = r.isPremium
        ? `Premium${r.priceAmount ? ` — ${r.currency} ${(r.priceAmount / 100).toFixed(0)}` : ''}`
        : 'Free';
      corpus.push({
        source: 'resource',
        refId: String(r.id),
        title: r.title,
        meta,
        url: `/resources/${r.id}`,
        category: `resource-${r.type}`,
        lang: 'en',
        summary: `${r.title} — ${String(r.type).replace(/_/g, ' ').toLowerCase()}${parts.length ? ` for ${parts.join(', ')}` : ''}. ${pricing}.`,
        text: `${r.title}. ${parts.join(' ')} ${r.type} ${pricing}`.trim(),
      });
    }
  }

  // 7) CMS posts (news, blogs, facts, opinion, Nepali).
  if (posts.status === 'fulfilled') {
    for (const p of posts.value) {
      const body = stripHtml(p.content);
      const summary = (p.metaDesc || body).slice(0, 400);
      corpus.push({
        source: 'post',
        refId: p.id,
        title: p.title,
        meta: p.createdAt
          ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : null,
        url: postUrl(p.type, p.id),
        category: p.type,
        lang: p.type.startsWith('NEPALI') ? 'ne' : 'en',
        summary,
        text: `${p.title}. ${body}`.trim().slice(0, 2000),
      });
    }
  }

  // 8) Publications.
  if (publications.status === 'fulfilled') {
    for (const p of publications.value) {
      const summary = stripHtml(p.description) || 'Publication';
      corpus.push({
        source: 'publication',
        refId: String(p.id),
        title: p.title,
        meta: null,
        url: `/publications/${p.slug}`,
        category: 'publication',
        lang: 'en',
        summary,
        text: `${p.title}. Publication. ${summary}`.trim(),
      });
    }
  }

  // 9) Events.
  if (events.status === 'fulfilled') {
    for (const e of events.value) {
      const summary = stripHtml(e.description) || 'Event';
      const when = e.eventDate
        ? new Date(e.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      corpus.push({
        source: 'event',
        refId: String(e.id),
        title: e.title,
        meta: [when, e.location].filter(Boolean).join(' — ') || null,
        url: `/events/${e.slug}`,
        category: 'event',
        lang: 'en',
        summary,
        text: `${e.title}. Event${when ? ` on ${when}` : ''}${e.location ? ` at ${e.location}` : ''}. ${summary}`.trim(),
      });
    }
  }

  // 10) WordPress posts (English + Nepali).
  const [wpEn, wpNe] = await Promise.allSettled([
    getWordPressPosts({ status: 'publish', lang: 'en' as WordPressLanguage, perPage: 100, embed: true }),
    getWordPressPosts({ status: 'publish', lang: 'ne' as WordPressLanguage, perPage: 100, embed: true }),
  ]);

  for (const [result, lang] of [
    [wpEn, 'en'],
    [wpNe, 'ne'],
  ] as const) {
    if (result.status !== 'fulfilled' || !Array.isArray(result.value?.data)) continue;
    for (const p of result.value.data) {
      const type = mapCategoryToType(p.categories, lang as WordPressLanguage);
      if (type === 'UNKNOWN') continue;
      const title = stripHtml(p.title?.rendered);
      const excerpt = stripHtml(p.excerpt?.rendered);
      if (!title) continue;
      corpus.push({
        source: 'wp',
        refId: `wp-${lang}-${p.id}`,
        title,
        meta: p.date
          ? new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : null,
        url: wpUrl(type, p.id),
        category: type,
        lang,
        summary: excerpt.slice(0, 350),
        text: `${title}. ${excerpt}`.trim().slice(0, 1200),
      });
    }
  }

  return corpus;
}

/**
 * Named sections counted in the admin UI, so a rebuild shows exactly what was
 * indexed (team, site docs, posts…), not just a single total.
 */
export function corpusBreakdown(corpus: CorpusItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of corpus) out[item.source] = (out[item.source] ?? 0) + 1;
  return out;
}
