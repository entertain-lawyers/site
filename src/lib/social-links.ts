/**
 * Helper types and utilities for TeamMember Direct Connect links.
 * Stored safely in TeamMember.websiteUrl as structured JSON (or legacy plain URL).
 */

export type PlatformKey =
  | 'website'
  | 'github'
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'whatsapp'
  | 'telegram'
  | 'threads'
  | 'tiktok'
  | 'discord'
  | 'scholar'
  | 'medium'
  | 'custom';

export interface SocialLinkItem {
  id: string;
  platform: PlatformKey;
  url: string;
  label?: string;
}

export interface PlatformConfig {
  key: PlatformKey;
  label: string;
  placeholder: string;
  hoverColor: string;
  hoverBgClass: string;
  badgeBg: string;
}

export const PLATFORM_OPTIONS: PlatformConfig[] = [
  {
    key: 'website',
    label: 'Portfolio / Website',
    placeholder: 'https://amritesh.com.np',
    hoverColor: 'hover:text-accent',
    hoverBgClass: 'hover:bg-accent hover:text-white hover:border-accent',
    badgeBg: 'bg-accent/10 text-accent',
  },
  {
    key: 'github',
    label: 'GitHub',
    placeholder: 'https://github.com/username',
    hoverColor: 'hover:text-[#24292e] dark:hover:text-[#f0f6fc]',
    hoverBgClass: 'hover:bg-[#24292e] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 hover:border-[#24292e] dark:hover:border-zinc-100',
    badgeBg: 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200',
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    placeholder: 'https://x.com/username',
    hoverColor: 'hover:text-black dark:hover:text-white',
    hoverBgClass: 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-black dark:hover:border-white',
    badgeBg: 'bg-black/5 dark:bg-white/10 text-black dark:text-white',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@channel',
    hoverColor: 'hover:text-[#ff0000]',
    hoverBgClass: 'hover:bg-[#ff0000] hover:text-white hover:border-[#ff0000]',
    badgeBg: 'bg-red-50 dark:bg-red-950/40 text-red-600',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    placeholder: 'https://wa.me/97798...',
    hoverColor: 'hover:text-[#25d366]',
    hoverBgClass: 'hover:bg-[#25d366] hover:text-white hover:border-[#25d366]',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600',
  },
  {
    key: 'telegram',
    label: 'Telegram',
    placeholder: 'https://t.me/username',
    hoverColor: 'hover:text-[#229ed9]',
    hoverBgClass: 'hover:bg-[#229ed9] hover:text-white hover:border-[#229ed9]',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600',
  },
  {
    key: 'threads',
    label: 'Threads',
    placeholder: 'https://threads.net/@username',
    hoverColor: 'hover:text-black dark:hover:text-white',
    hoverBgClass: 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-black dark:hover:border-white',
    badgeBg: 'bg-black/5 dark:bg-white/10 text-black dark:text-white',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@username',
    hoverColor: 'hover:text-[#fe2c55]',
    hoverBgClass: 'hover:bg-black hover:text-white hover:border-black',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600',
  },
  {
    key: 'discord',
    label: 'Discord',
    placeholder: 'https://discord.gg/... or profile link',
    hoverColor: 'hover:text-[#5865f2]',
    hoverBgClass: 'hover:bg-[#5865f2] hover:text-white hover:border-[#5865f2]',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600',
  },
  {
    key: 'scholar',
    label: 'Google Scholar / Research',
    placeholder: 'https://scholar.google.com/citations?...',
    hoverColor: 'hover:text-[#4285f4]',
    hoverBgClass: 'hover:bg-[#4285f4] hover:text-white hover:border-[#4285f4]',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600',
  },
  {
    key: 'medium',
    label: 'Medium / Substack',
    placeholder: 'https://medium.com/@username',
    hoverColor: 'hover:text-[#00ab6c]',
    hoverBgClass: 'hover:bg-[#00ab6c] hover:text-white hover:border-[#00ab6c]',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/...',
    hoverColor: 'hover:text-[#0A66C2]',
    hoverBgClass: 'hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-[#0A66C2]',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/...',
    hoverColor: 'hover:text-[#1877f2]',
    hoverBgClass: 'hover:bg-[#1877f2] hover:text-white hover:border-[#1877f2]',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-[#1877f2]',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/...',
    hoverColor: 'hover:text-[#e1306c]',
    hoverBgClass: 'hover:bg-gradient-to-tr hover:from-[#833AB4] hover:via-[#E1306C] hover:to-[#F77737] hover:text-white hover:border-transparent',
    badgeBg: 'bg-pink-50 dark:bg-pink-950/40 text-[#e1306c]',
  },
  {
    key: 'custom',
    label: 'Custom Link',
    placeholder: 'https://...',
    hoverColor: 'hover:text-accent',
    hoverBgClass: 'hover:bg-accent hover:text-white hover:border-accent',
    badgeBg: 'bg-slate-100 dark:bg-zinc-800 text-text-primary',
  },
];

const CONFIG_MAP = new Map<string, PlatformConfig>(
  PLATFORM_OPTIONS.map((opt) => [opt.key, opt])
);

export function getPlatformConfig(key: string): PlatformConfig {
  return (
    CONFIG_MAP.get(key) || {
      key: 'custom',
      label: 'Direct Link',
      placeholder: 'https://...',
      hoverColor: 'hover:text-accent',
      hoverBgClass: 'hover:bg-accent hover:text-white hover:border-accent',
      badgeBg: 'bg-slate-100 dark:bg-zinc-800 text-text-primary',
    }
  );
}

/**
 * Normalizes user-entered URL strings.
 * Prepends https:// if schema is missing, unless it's mailto: or tel:.
 */
export function normalizeSocialUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Parses stored websiteUrl value. Can handle:
 * 1. JSON array of SocialLinkItem
 * 2. Legacy single URL (e.g. "https://example.com")
 * 3. Null, empty, or invalid data -> returns empty array
 */
export function parseSocialLinks(raw: string | null | undefined): SocialLinkItem[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && typeof item.url === 'string' && item.url.trim().length > 0)
        .map((item, idx) => ({
          id: String(item.id || `social-${idx}-${idx}`),
          platform: (item.platform || 'website') as PlatformKey,
          url: normalizeSocialUrl(String(item.url)),
          label: item.label ? String(item.label).trim() : undefined,
        }));
    }
  } catch {
    // Legacy single URL string fallback
    if (/^https?:\/\//i.test(trimmed)) {
      return [
        {
          id: 'social-legacy-website',
          platform: 'website',
          url: trimmed,
          label: 'Portfolio / Website',
        },
      ];
    }
  }

  return [];
}

/**
 * Serializes links into JSON string.
 * Returns null if no links with valid non-empty URLs exist.
 */
export function serializeSocialLinks(links: SocialLinkItem[]): string | null {
  if (!Array.isArray(links)) return null;

  const valid = links
    .map((l) => ({
      platform: l.platform,
      url: normalizeSocialUrl(l.url),
      ...(l.label?.trim() ? { label: l.label.trim() } : {}),
    }))
    .filter((l) => l.url.length > 0);

  if (valid.length === 0) return null;
  return JSON.stringify(valid);
}
