import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Landmark, Newspaper, Briefcase, Search, ScrollText, MessageSquare } from 'lucide-react';
import HomeSearchBar from '@/components/home/HomeSearchBar';

export const metadata = {
  title: 'Entertain Lawyers - Nepalese Legal Education Platform',
  description: 'Comprehensive law notes, old questions, case laws, and study resources for BA.LLB and LLB students.',
};

export default async function HomePage() {


  return (
    <div className="w-full bg-background min-h-screen pb-12 sm:pb-16 lg:pb-20 relative overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 dark:bg-accent/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[100px] pointer-events-none" />

      {/* Advertisement Placeholder */}
      <div className="w-full pt-6 pb-2 sm:pt-8 sm:pb-4 flex justify-center px-4 relative z-10">
        <div className="w-full max-w-[800px] h-[70px] sm:h-[90px] bg-surface/50 backdrop-blur-sm border border-dashed border-border rounded-2xl flex items-center justify-center text-text-muted text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase transition-colors hover:bg-surface/80 hover:border-border-strong cursor-default">
          Advertisement
        </div>
      </div>

      {/* Hero Section */}
      <section className="pt-6 pb-10 sm:pt-8 sm:pb-12 flex flex-col items-center justify-center text-center px-4 relative z-10">
        <div className="relative w-full max-w-[280px] sm:max-w-[480px] md:max-w-[600px] h-32 sm:h-40 md:h-48 mb-4 drop-shadow-sm">
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
        <p className="max-w-2xl text-text-secondary text-fluid-base font-medium tracking-wide mt-2">
          Nepal's premium platform for comprehensive <span className="text-accent font-bold">law notes</span>, <span className="text-accent font-bold">case laws</span>, and <span className="text-accent font-bold">study resources</span>.
        </p>
      </section>

      {/* Core Resource Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 lg:mb-24 relative z-10">
        
        {/* Search Bar */}
        <div className="w-full max-w-4xl mx-auto mb-16 relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-full blur opacity-70"></div>
          <HomeSearchBar />
        </div>

        {/* 6-Block Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          
          {/* Card 1: Law Notes */}
          <Link href="/study?type=LAW_NOTE" className="group block h-full">
            <div className="h-full bg-surface p-5 sm:p-6 lg:p-8 rounded-2xl border border-border shadow-sm transition-all duration-500 motion-safe:hover:-translate-y-2 motion-safe:hover:shadow-[0_20px_40px_rgba(var(--color-accent),0.15)] hover:border-accent/40 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-transform duration-500 motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-3 relative z-10">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-accent" strokeWidth={1.5} />
              </div>
              <h3 className="text-base sm:text-lg lg:text-[1.35rem] font-semibold text-navy dark:text-white uppercase tracking-wide leading-[1.2] mb-3 max-w-[220px] mx-auto relative z-10">
                Law Notes
              </h3>
              <p className="text-[13px] text-text-muted font-medium lg:opacity-0 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 transition-all duration-500 flex items-center gap-1 mt-auto relative z-10">
                Explore Notes <span className="text-accent motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1">→</span>
              </p>
            </div>
          </Link>

          {/* Card 2: Precedent Case Laws */}
          <Link href="/study?type=CASE_LAW" className="group block h-full">
            <div className="h-full bg-surface p-5 sm:p-6 lg:p-8 rounded-2xl border border-border shadow-sm transition-all duration-500 motion-safe:hover:-translate-y-2 motion-safe:hover:shadow-[0_20px_40px_rgba(var(--color-accent),0.15)] hover:border-purple-500/40 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-transform duration-500 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3 relative z-10">
                <Landmark className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base sm:text-lg lg:text-[1.35rem] font-semibold text-navy dark:text-white uppercase tracking-wide leading-[1.2] mb-3 max-w-[220px] mx-auto relative z-10">
                Precedent<br/>Case Laws
              </h3>
              <p className="text-[13px] text-text-muted font-medium lg:opacity-0 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 transition-all duration-500 flex items-center gap-1 mt-auto relative z-10">
                View Precedents <span className="text-purple-500 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1">→</span>
              </p>
            </div>
          </Link>

          {/* Card 3: News */}
          <Link href="/news" className="group block h-full">
            <div className="h-full bg-surface p-5 sm:p-6 lg:p-8 rounded-2xl border border-border shadow-sm transition-all duration-500 motion-safe:hover:-translate-y-2 motion-safe:hover:shadow-[0_20px_40px_rgba(var(--color-accent),0.15)] hover:border-blue-500/40 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-transform duration-500 motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-3 relative z-10">
                <Newspaper className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base sm:text-lg lg:text-[1.35rem] font-semibold text-navy dark:text-white uppercase tracking-wide leading-[1.2] mb-3 max-w-[220px] mx-auto relative z-10">
                News
              </h3>
              <p className="text-[13px] text-text-muted font-medium lg:opacity-0 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 transition-all duration-500 flex items-center gap-1 mt-auto relative z-10">
                Read Latest <span className="text-blue-500 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1">→</span>
              </p>
            </div>
          </Link>

          {/* Card 4: Old Questions */}
          <Link href="/study?type=OLD_QUESTION" className="group block h-full">
            <div className="h-full bg-surface p-5 sm:p-6 lg:p-8 rounded-2xl border border-border shadow-sm transition-all duration-500 motion-safe:hover:-translate-y-2 motion-safe:hover:shadow-[0_20px_40px_rgba(var(--color-accent),0.15)] hover:border-amber-500/40 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-transform duration-500 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3 relative z-10">
                <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base sm:text-lg lg:text-[1.35rem] font-semibold text-navy dark:text-white uppercase tracking-wide leading-[1.2] mb-3 max-w-[220px] mx-auto relative z-10">
                Old Questions
              </h3>
              <p className="text-[13px] text-text-muted font-medium lg:opacity-0 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 transition-all duration-500 flex items-center gap-1 mt-auto relative z-10">
                Practice Now <span className="text-amber-500 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1">→</span>
              </p>
            </div>
          </Link>

          {/* Card 5: Historical Facts */}
          <Link href="/historical-facts" className="group block h-full">
            <div className="h-full bg-surface p-5 sm:p-6 lg:p-8 rounded-2xl border border-border shadow-sm transition-all duration-500 motion-safe:hover:-translate-y-2 motion-safe:hover:shadow-[0_20px_40px_rgba(var(--color-accent),0.15)] hover:border-emerald-500/40 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-transform duration-500 motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-3 relative z-10">
                <ScrollText className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base sm:text-lg lg:text-[1.35rem] font-semibold text-navy dark:text-white uppercase tracking-wide leading-[1.2] mb-3 max-w-[220px] mx-auto relative z-10">
                Historical Facts<br/>& Personalities
              </h3>
              <p className="text-[13px] text-text-muted font-medium lg:opacity-0 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 transition-all duration-500 flex items-center gap-1 mt-auto relative z-10">
                Discover History <span className="text-emerald-500 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1">→</span>
              </p>
            </div>
          </Link>

          {/* Card 6: Blogs */}
          <Link href="/blogs" className="group block h-full">
            <div className="h-full bg-surface p-5 sm:p-6 lg:p-8 rounded-2xl border border-border shadow-sm transition-all duration-500 motion-safe:hover:-translate-y-2 motion-safe:hover:shadow-[0_20px_40px_rgba(var(--color-accent),0.15)] hover:border-pink-500/40 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-transform duration-500 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3 relative z-10">
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-pink-600 dark:text-pink-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base sm:text-lg lg:text-[1.35rem] font-semibold text-navy dark:text-white uppercase tracking-wide leading-[1.2] mb-3 max-w-[220px] mx-auto relative z-10">
                Blogs<br/>Opinion & Others
              </h3>
              <p className="text-[13px] text-text-muted font-medium lg:opacity-0 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 transition-all duration-500 flex items-center gap-1 mt-auto relative z-10">
                Read Insights <span className="text-pink-500 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1">→</span>
              </p>
            </div>
          </Link>

        </div>
      </section>

    </div>
  );
}
