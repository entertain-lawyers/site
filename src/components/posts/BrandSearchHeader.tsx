import Image from 'next/image';
import dynamic from 'next/dynamic';

// Shared client search implementation, loaded lazily with the same
// placeholder the content listing pages use.
const HomeSearchBar = dynamic(() => import('@/components/home/HomeSearchBar'), {
  loading: () => <div className="h-12 w-full bg-surface-alt animate-pulse rounded-full"></div>
});

/**
 * Shared brand header block: Entertain Lawyers wordmark + divider + search bar.
 * Rendered on content listing and article detail pages so branding and search
 * remain visible consistently next to the sticky navbar.
 */
export default function BrandSearchHeader() {
  return (
    <>
      <section className="pt-2 pb-4 sm:pt-3 sm:pb-6 flex flex-col items-center justify-center text-center relative z-10">
        <div className="relative w-full max-w-[280px] sm:max-w-[480px] md:max-w-[600px] h-24 sm:h-32 md:h-36 mb-0 drop-shadow-sm">
          <Image
            src="/wordmark_navy.png"
            alt="Entertain Lawyers - Connecting with Legal Updates"
            fill
            className="object-contain dark:hidden"
            priority
          />
          <Image
            src="/wordmark_white.png"
            alt="Entertain Lawyers - Connecting with Legal Updates"
            fill
            className="object-contain hidden dark:block"
            priority
          />
        </div>
      </section>

      <div className="w-full max-w-3xl mx-auto px-6 mb-6 sm:mb-8 relative z-10">
        <hr className="border-t-2 border-border-strong dark:border-white/20" />
      </div>

      <section className="max-w-7xl mx-auto mb-12 sm:mb-16 relative z-10">
        <div className="w-full max-w-3xl mx-auto relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-full blur opacity-70"></div>
          <HomeSearchBar />
        </div>
      </section>
    </>
  );
}
