import { Library, Scale } from 'lucide-react';

export default function StudyLoading() {
  return (
    <div className="bg-background min-h-screen pb-20 transition-colors duration-300">
      <div className="bg-surface border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/5 via-background to-transparent dark:from-accent/10 dark:via-background dark:to-transparent opacity-70 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 relative z-10">
          <div className="h-10 bg-surface-alt rounded-lg w-1/3 mb-4 animate-pulse"></div>
          <div className="h-6 bg-surface-alt rounded-lg w-1/2 animate-pulse"></div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative z-20 -mt-4 sm:-mt-6">
        <div className="bg-surface shadow-soft border border-border rounded-2xl p-4 sm:p-6 mb-8 sm:mb-12 animate-pulse h-32"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="group flex flex-col bg-surface border border-border rounded-2xl p-6 h-64 animate-pulse">
              <div className="flex justify-between mb-5">
                <div className="w-24 h-6 bg-surface-alt rounded-md"></div>
                <div className="w-16 h-6 bg-surface-alt rounded-md"></div>
              </div>
              <div className="w-3/4 h-6 bg-surface-alt rounded-md mb-2"></div>
              <div className="w-1/2 h-6 bg-surface-alt rounded-md mb-4"></div>
              
              <div className="mt-auto space-y-2 mb-6">
                <div className="w-full h-4 bg-surface-alt rounded-md"></div>
                <div className="w-2/3 h-4 bg-surface-alt rounded-md"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
