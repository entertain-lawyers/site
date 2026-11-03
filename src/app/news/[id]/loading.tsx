export default function NewsDetailLoading() {
  return (
    <div className="min-h-screen bg-background py-8 sm:py-12" role="status" aria-live="polite">
      <span className="sr-only">Loading article...</span>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
          {/* Main article column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="h-4 w-28 bg-surface-alt rounded animate-pulse" />
            <div className="space-y-3">
              <div className="h-10 w-full bg-surface-alt rounded-xl animate-pulse" />
              <div className="h-10 w-4/5 bg-surface-alt rounded-xl animate-pulse" />
            </div>
            <div className="flex items-center gap-4 py-2 border-y border-border">
              <div className="w-10 h-10 rounded-full bg-surface-alt animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 bg-surface-alt rounded animate-pulse" />
                <div className="h-3 w-48 bg-surface-alt rounded animate-pulse" />
              </div>
            </div>
            {/* Hero image placeholder */}
            <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-zinc-800 rounded-xl border border-border animate-pulse" />
            {/* Body paragraphs */}
            <div className="space-y-3 pt-4">
              <div className="h-4 w-full bg-surface-alt rounded animate-pulse" />
              <div className="h-4 w-full bg-surface-alt rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-surface-alt rounded animate-pulse" />
              <div className="h-4 w-full bg-surface-alt rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-surface-alt rounded animate-pulse" />
            </div>
          </div>

          {/* Sidebar rail */}
          <aside className="space-y-6 hidden lg:block">
            <div className="h-6 w-32 bg-surface-alt rounded animate-pulse mb-4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 p-3 border border-border rounded-xl bg-surface animate-pulse">
                <div className="w-20 h-16 bg-slate-100 dark:bg-zinc-800 rounded shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-full bg-surface-alt rounded" />
                  <div className="h-3 w-1/2 bg-surface-alt rounded" />
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}
