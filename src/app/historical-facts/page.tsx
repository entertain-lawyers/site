import { SubjectCard } from '@/components/study/SubjectCard';
import { Hourglass, Users } from 'lucide-react';
import BrandSearchHeader from '@/components/posts/BrandSearchHeader';
export default function HistoricalFactsLandingPage() {
  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Shared Hero Logo & Search */}
        <BrandSearchHeader />

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
