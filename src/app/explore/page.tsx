import Link from 'next/link';
import { BookOpen, Landmark, ScrollText, Newspaper, Clock, PenTool } from 'lucide-react';

export const metadata = {
  title: 'Explore Materials - Entertain Lawyers',
  description: 'Explore the comprehensive legal study materials, precedent case laws, old questions, and historical facts provided by Entertain Lawyers.',
};

export default function ExplorePage() {
  const categories = [
    {
      id: 'law-notes',
      title: 'Law Notes',
      description: 'Simple and clear notes for all your BA.LLB and LLB subjects. We make complex law topics easy to understand.',
      icon: BookOpen,
      href: '/study?type=LAW_NOTE',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'case-laws',
      title: 'Case Laws',
      description: 'Easy-to-read summaries of important Supreme Court decisions to help you understand how laws work in real life.',
      icon: Landmark,
      href: '/study?type=CASE_LAW',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'old-questions',
      title: 'Old Questions',
      description: 'Past exam papers to help you practice and prepare for your finals.',
      icon: ScrollText,
      href: '/study?type=OLD_QUESTION',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'news',
      title: 'Legal News & Updates',
      description: 'The latest legal and political news in Nepal, keeping you informed about what is happening right now.',
      icon: Newspaper,
      href: '/news',
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'historical-facts',
      title: 'Historical Facts',
      description: 'Learn about the history of law in Nepal, including how our constitutions and rights have changed over time.',
      icon: Clock,
      href: '/historical-facts',
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
    {
      id: 'blogs',
      title: 'Blogs',
      description: 'Interesting articles and opinions written by law students and legal professionals.',
      icon: PenTool,
      href: '/blogs',
      color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },
  ];

  return (
    <div className="w-full bg-background min-h-screen pb-16 sm:pb-24 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 dark:bg-accent/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 lg:pt-28 pb-12 relative z-10 text-center">
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-6 uppercase tracking-wider">
          Study Materials
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-navy dark:text-white tracking-tight mb-6 leading-tight">
          Explore Our <span className="text-accent dark:text-[#ddba76]">Materials</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-text-secondary dark:text-white/80 leading-relaxed">
          Find all the study materials you need for your BA.LLB and LLB journey in one place. Simple, clear, and easy to use.
        </p>
      </div>

      {/* Materials Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mt-8 sm:mt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.id}
                href={category.href}
                className="group relative flex flex-col p-8 bg-white dark:bg-surface border border-border dark:border-white/5 rounded-3xl shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-2 overflow-hidden"
              >
                {/* Hover Gradient Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 ${category.color}`}>
                  <Icon className="w-7 h-7" />
                </div>

                <h3 className="text-xl font-bold text-navy dark:text-white mb-3 group-hover:text-accent dark:group-hover:text-[#ddba76] transition-colors">
                  {category.title}
                </h3>

                <p className="text-text-secondary dark:text-white/70 leading-relaxed flex-grow">
                  {category.description}
                </p>

                <div className="mt-8 flex items-center text-sm font-semibold text-accent dark:text-[#ddba76]">
                  <span>Explore Materials</span>
                  <svg
                    className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
