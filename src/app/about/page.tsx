import { getDictionary } from '@/lib/i18n';
import { Target, Lightbulb, ShieldCheck } from 'lucide-react';

export async function generateMetadata() {
  const dict = await getDictionary();
  return {
    title: `${dict.aboutTitle} - Entertain Lawyers`,
    description: dict.aboutP1.substring(0, 150) + '...',
  };
}

export default async function AboutPage() {
  const dict = await getDictionary();

  return (
    <main className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-6">
            {dict.aboutTitle}
          </h1>
          <p className="text-lg md:text-xl text-text-secondary leading-relaxed max-w-3xl mx-auto">
            {dict.aboutP1}
          </p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8 md:p-12 mb-16 relative overflow-hidden group hover:border-accent transition-colors">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-110 transition-transform duration-700" />
          <h2 className="text-2xl font-bold text-navy dark:text-white mb-4 relative z-10">Our Story</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none text-text-secondary relative z-10">
            <p className="mb-4">
              {dict.aboutP2}
            </p>
            <p>
              Entertain Lawyers was founded with a singular purpose: to democratize access to high-quality legal education materials for law students across Nepal. We understand the rigorous demands of the BA.LLB and LLB programs, and we are dedicated to providing the resources necessary to navigate those challenges successfully.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Mission */}
          <div className="bg-surface rounded-xl p-8 border border-border shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white mb-3">Our Mission</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              To empower legal scholars by providing a comprehensive, accessible, and meticulously curated platform for essential study materials, precedent case laws, and exam resources.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-surface rounded-xl p-8 border border-border shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6">
              <Lightbulb className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white mb-3">Our Vision</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              To become the most trusted digital companion for every law student and legal professional in Nepal, setting the gold standard for legal education technology.
            </p>
          </div>

          {/* Why Us */}
          <div className="bg-surface rounded-xl p-8 border border-border shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white mb-3">Why Choose Us</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              We guarantee authenticated materials, regular syllabus updates, secure reading environments, and a user-first experience built specifically for the Nepalese legal context.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
