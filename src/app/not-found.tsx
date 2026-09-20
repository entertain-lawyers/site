import Link from 'next/link';
import { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: `${dict.pageNotFound} | Entertain Lawyers`,
    description: dict.pageNotFoundDesc,
  };
}

export default async function NotFound() {
  const dict = await getDictionary();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center transition-colors duration-300">
      <div className="bg-surface p-8 md:p-12 rounded-2xl border border-border shadow-soft max-w-lg w-full">
        <div className="w-20 h-20 bg-accent/5 text-accent rounded-full flex items-center justify-center mx-auto mb-6 border border-accent/10">
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-fluid-h2 font-extrabold text-navy dark:text-white mb-2 tracking-tight">{dict.pageNotFound}</h1>
        <p className="text-text-secondary mb-8 leading-relaxed text-fluid-base">
          {dict.pageNotFoundDesc}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/study"
            className="inline-flex justify-center items-center px-6 py-3.5 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-accent hover:bg-accent-hover transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent active:scale-[0.98] hover:shadow-[0_0_15px_rgba(var(--color-accent),0.4)] hover:-translate-y-0.5"
          >
            {dict.browseStudyMaterials}
          </Link>
          <Link
            href="/"
            className="inline-flex justify-center items-center px-6 py-3.5 border border-border text-sm font-bold rounded-xl text-navy dark:text-white bg-surface hover:bg-surface-alt transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border active:scale-[0.98]"
          >
            {dict.goHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
