import { SubjectCard } from '@/components/study/SubjectCard';
import { Hourglass, Users } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const HomeSearchBar = dynamic(() => import('@/components/home/HomeSearchBar'), {
  loading: () => <div className="h-12 w-full bg-surface-alt animate-pulse rounded-full"></div>
});
export default function HistoricalFactsLandingPage() {
  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Restored Hero Logo & Search */}
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

        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-6">
            Historical Facts & Legal Personalities
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            Discover interesting historical facts, events, trivia, and prominent legal personalities in the Nepalese legal system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto mb-16">
          <SubjectCard 
            title="Historical Facts"
            subtitle=""
            href="/historical-facts/historical"
            icon={Hourglass}
          />
          <SubjectCard 
            title="Legal Personalities"
            subtitle=""
            href="/historical-facts/personalities"
            icon={Users}
          />
        </div>
      </div>
    </div>
  );
}
