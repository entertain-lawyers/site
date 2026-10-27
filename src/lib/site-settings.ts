import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/**
 * Site-wide editable settings.
 *
 * These live in the database so an admin can change the organisation name,
 * contact details, social profiles and footer notice without a deploy. A
 * missing row (or an unreachable database during a preview build) falls back
 * to the values the public site has always shipped with.
 */

export const SITE_SETTINGS_ID = 'global';
export const HOMEPAGE_CONFIG_ID = 'home';

export interface SiteSettings {
  organizationName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  footerCopyright: string | null;
}

export interface HomepageConfig {
  heroHeading: string;
  heroSubheading: string | null;
  heroCtaText: string | null;
  heroCtaLink: string | null;
  announcementText: string | null;
  announcementLink: string | null;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  organizationName: 'Entertain Lawyers',
  contactEmail: 'contact@entertainlawyers.com',
  contactPhone: '+977 9822010737',
  address: 'Pokhara Metropolitan City-1, Kaski',
  facebookUrl: 'https://www.facebook.com/entertainlawyers',
  twitterUrl: 'https://twitter.com/entertainlawyers',
  instagramUrl: 'https://www.instagram.com/entertainlawyers',
  youtubeUrl: 'https://youtube.com/entertainlawyers',
  footerCopyright: null,
};

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  heroHeading: 'Entertain Lawyers - Connecting with Legal Updates',
  heroSubheading: null,
  heroCtaText: null,
  heroCtaLink: null,
  announcementText: null,
  announcementLink: null,
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function cleanUrl(value: string | null | undefined): string | null {
  const trimmed = clean(value);
  if (!trimmed) return null;
  // Be forgiving if an admin pastes a bare domain.
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/**
 * Memoised per request with React `cache`, so the layout, footer, contact page
 * and metadata share a single query.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const row = await prisma.globalSettings.findUnique({
      where: { id: SITE_SETTINGS_ID },
    });

    if (!row) return DEFAULT_SITE_SETTINGS;

    return {
      organizationName: clean(row.organizationName) ?? DEFAULT_SITE_SETTINGS.organizationName,
      contactEmail: clean(row.contactEmail) ?? DEFAULT_SITE_SETTINGS.contactEmail,
      contactPhone: clean(row.contactPhone) ?? DEFAULT_SITE_SETTINGS.contactPhone,
      address: clean(row.address) ?? DEFAULT_SITE_SETTINGS.address,
      facebookUrl: cleanUrl(row.facebookUrl) ?? DEFAULT_SITE_SETTINGS.facebookUrl,
      twitterUrl: cleanUrl(row.twitterUrl) ?? DEFAULT_SITE_SETTINGS.twitterUrl,
      instagramUrl: cleanUrl(row.instagramUrl) ?? DEFAULT_SITE_SETTINGS.instagramUrl,
      youtubeUrl: cleanUrl(row.youtubeUrl) ?? DEFAULT_SITE_SETTINGS.youtubeUrl,
      footerCopyright: clean(row.footerCopyright),
    };
  } catch (error) {
    console.error('Could not load site settings; using defaults.', error);
    return DEFAULT_SITE_SETTINGS;
  }
});

export const getHomepageConfig = cache(async (): Promise<HomepageConfig> => {
  try {
    const row = await prisma.homepageConfig.findUnique({
      where: { id: HOMEPAGE_CONFIG_ID },
    });

    if (!row) return DEFAULT_HOMEPAGE_CONFIG;

    return {
      heroHeading: clean(row.heroHeading) ?? DEFAULT_HOMEPAGE_CONFIG.heroHeading,
      heroSubheading: clean(row.heroSubheading),
      heroCtaText: clean(row.heroCtaText),
      heroCtaLink: clean(row.heroCtaLink),
      announcementText: clean(row.announcementText),
      announcementLink: clean(row.announcementLink),
    };
  } catch (error) {
    console.error('Could not load homepage configuration; using defaults.', error);
    return DEFAULT_HOMEPAGE_CONFIG;
  }
});

/** Strip spaces so a display phone number works in a `tel:` link. */
export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/**
 * Build the copyright line. `{year}` is replaced so the notice stays current
 * even when an admin saves it once.
 */
export function copyrightLine(settings: SiteSettings, fallbackRights: string): string {
  if (settings.footerCopyright) {
    return settings.footerCopyright.replace(/\{year\}/gi, String(new Date().getFullYear()));
  }
  return `© ${new Date().getFullYear()} ${settings.organizationName} Pvt. Ltd. ${fallbackRights}`;
}
