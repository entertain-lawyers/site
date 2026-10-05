import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Landmark, Newspaper, Briefcase, Search, ScrollText, MessageSquare } from 'lucide-react';
import dynamic from 'next/dynamic';

const HomeSearchBar = dynamic(() => import('@/components/home/HomeSearchBar'), {
  loading: () => <div className="h-12 w-full bg-surface-alt animate-pulse rounded-full"></div>
});

const HomeCategoryGrid = dynamic(() => import('@/components/home/HomeCategoryGrid').then(mod => mod.HomeCategoryGrid), {
  loading: () => <div className="h-64 w-full bg-surface-alt animate-pulse rounded-2xl"></div>
});

export const metadata = {
  title: 'Entertain Lawyers - Nepalese Legal Education Platform',
  description: 'Comprehensive law notes, old questions, case laws, and study resources for BA.LLB and LLB students.',
};

export default function HomePage() {
  return (
    <div className="w-full bg-background min-h-screen pb-12 sm:pb-16 lg:pb-20 relative overflow-hidden">

      {/* Background Decorative Elements */}
      <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 dark:bg-accent/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <section className="pt-2 pb-4 sm:pt-3 sm:pb-6 flex flex-col items-center justify-center text-center px-4 relative z-10">
        <div className="relative w-full max-w-[280px] sm:max-w-[480px] md:max-w-[600px] h-24 sm:h-32 md:h-36 mb-0 drop-shadow-sm">
          {/* Light Mode Logo */}
          <Image
            src="/wordmark_navy.png"
            alt="Entertain Lawyers - Connecting with Legal Updates"
            fill
            className="object-contain dark:hidden"
            priority
          />
          {/* Dark Mode Logo */}
          <Image
            src="/wordmark_white.png"
            alt="Entertain Lawyers - Connecting with Legal Updates"
            fill
            className="object-contain hidden dark:block"
            priority
          />
        </div>
        <h1 className="sr-only">Entertain Lawyers - Connecting with Legal Updates</h1>
        <p className="max-w-2xl text-text-secondary text-fluid-base font-medium tracking-wide mt-1">
          Nepal's premium platform for comprehensive <span className="text-accent font-bold">law notes</span>, <span className="text-accent font-bold">case laws</span>, and <span className="text-accent font-bold">study resources</span>.
        </p>
      </section>

      {/* Divider Line */}
      <div className="w-full max-w-3xl mx-auto px-6 mb-4 sm:mb-6 relative z-10">
        <hr className="border-t-2 border-border-strong dark:border-white/20" />
      </div>

      {/* Core Resource Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 lg:mb-24 relative z-10">

        {/* Search Bar */}
        <div className="w-full max-w-3xl mx-auto mb-10 sm:mb-12 relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-full blur opacity-70"></div>
          <HomeSearchBar />
        </div>

        {/* 6-Block Grid */}
        <HomeCategoryGrid />
      </section>

    </div>
  );
}
