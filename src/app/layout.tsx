import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Inter, Noto_Sans_Devanagari, Mukta } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TopUtilityBar from '@/components/layout/TopUtilityBar';
import ContentProtection from '@/components/ContentProtection';
import { getLocale, getDictionary } from '@/lib/i18n';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import NextTopLoader from 'nextjs-toploader';
import PublicOnly from '@/components/layout/PublicOnly';
import AskAI from '@/components/ai/AskAI';
import { getSiteSettings } from '@/lib/site-settings';
import AnalyticsTracker from '@/components/AnalyticsTracker';

/**
 * Site-wide typography. Restored Mukta as the requested legacy face
 * (Latin + Devanagari). Plus Jakarta Sans remains loaded and scoped to the
 * calculator and news reading page via `.el-type-modern` in globals.css.
 */
const mukta = Mukta({ weight: ['400', '500', '600', '700', '800'], subsets: ['devanagari', 'latin'], variable: '--font-mukta' });

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

/**
 * Chatbot typography. Inter is the de-facto standard for modern chat UIs
 * (Latin), with Noto Sans Devanagari for Nepali — the most widely used
 * Devanagari webfont. Both keep tall x-heights so mixed EN/NE replies at
 * 15px stay legible. Scoped to the AskAI widget via `.chat-font`.
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-chat-latin', display: 'swap' });
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-chat-devanagari',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const brand = settings.organizationName;
  const description = 'Legal resources, law notes, old questions, and case laws for BALLB and LLB students in Nepal.';

  return {
    metadataBase: new URL('https://www.entertainlawyers.com'),
    title: {
      default: `${brand} — Nepal Legal Education Platform`,
      template: `%s | ${brand}`,
    },
    description,
    openGraph: {
      title: `${brand} — Nepal Legal Education Platform`,
      description,
      url: 'https://www.entertainlawyers.com',
      siteName: brand,
      locale: 'en_NP',
      type: 'website',
      images: [
        {
          url: '/logo.jpg',
          width: 512,
          height: 512,
          alt: brand,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: `${brand} — Nepal Legal Education Platform`,
      description,
      images: ['/logo.jpg'],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = await getDictionary();
  const session = await auth();
  const settings = await getSiteSettings();

  const getCachedSemesters = unstable_cache(
    async () => {
      return prisma.semester.findMany({
        orderBy: { order: 'asc' },
        select: { id: true, name: true }
      });
    },
    ['layout-semesters'],
    { revalidate: 3600 }
  );

  const semesters = await getCachedSemesters();
  // Defensive guard: collapse any duplicate semester rows (bad seeds/scripts
  // have leaked 'S1' stubs into this table before) to a single entry each.
  const uniqueSemesters = semesters.filter((s, i) => {
    const key = s.name.trim().toLowerCase();
    return semesters.findIndex((x) => x.name.trim().toLowerCase() === key) === i;
  });

  // A lightweight script to apply the theme before hydration, preventing FOUC.
  // It checks localStorage, then defaults to 'light' (as it's the primary brand).
  const themeInitScript = `
    (function() {
      try {
        var theme = localStorage.getItem('theme');
        if (theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.setAttribute('data-theme', 'light');
        }
      } catch (e) {}
    })();
  `;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.entertainlawyers.com/#organization",
                  "name": settings.organizationName,
                  "url": "https://www.entertainlawyers.com",
                  "email": settings.contactEmail,
                  "telephone": settings.contactPhone,
                  "address": {
                    "@type": "PostalAddress",
                    "streetAddress": settings.address,
                    "addressCountry": "NP"
                  },
                  "sameAs": [
                    settings.facebookUrl,
                    settings.instagramUrl,
                    settings.youtubeUrl,
                    settings.twitterUrl,
                    // TikTok is not stored in GlobalSettings yet; keep the
                    // current profile so structured data stays complete.
                    'https://www.tiktok.com/@entertain.lawyers'
                  ].filter(Boolean)
                },
                {
                  "@type": "WebSite",
                  "@id": "https://www.entertainlawyers.com/#website",
                  "url": "https://www.entertainlawyers.com",
                  "name": settings.organizationName,
                  "description": "Nepal Legal Education Platform",
                  "publisher": {
                    "@id": "https://www.entertainlawyers.com/#organization"
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className={`${mukta.variable} ${jakarta.variable} ${inter.variable} ${notoDevanagari.variable} bg-background text-text-primary flex flex-col min-h-screen transition-colors duration-200`}>
        <NextTopLoader color="var(--color-accent)" showSpinner={false} shadow="0 0 10px var(--color-accent),0 0 5px var(--color-accent)" />
        <AnalyticsTracker />
        <ContentProtection />
        <PublicOnly>
          <TopUtilityBar locale={locale} dict={dict} />
          <Navbar dict={dict} session={session} semesters={uniqueSemesters} locale={locale} />
        </PublicOnly>
        <main className="flex-grow flex flex-col">
          {children}
        </main>
        <PublicOnly>
          <Footer dict={dict} settings={settings} />
          <AskAI />
        </PublicOnly>
      </body>
    </html>
  );
}
