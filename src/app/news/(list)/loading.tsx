export default function NewsLoading() {
  return (
    <div className="min-h-screen bg-background py-8 sm:py-12" role="status" aria-live="polite">
      <span className="sr-only">Loading legal news...</span>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand/Hero skeleton */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-64 h-16 bg-surface-alt rounded-2xl animate-pulse mb-6" />
          <div className="w-full max-w-3xl h-12 bg-surface-alt rounded-full animate-pulse" />
        </div>

        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="h-10 w-48 bg-surface-alt rounded-xl mx-auto animate-pulse" />
          <div className="h-5 w-96 max-w-full bg-surface-alt rounded-lg mx-auto animate-pulse" />
        </div>

        {/* 3-column article cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col animate-pulse"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="w-full h-48 bg-slate-100 dark:bg-zinc-800" />
              <div className="p-6 sm:p-8 flex flex-col flex-1 space-y-4">
                <div className="h-3 w-16 bg-red-100 dark:bg-red-950/40 rounded" />
                <div className="space-y-2">
                  <div className="h-5 w-full bg-surface-alt rounded" />
                  <div className="h-5 w-3/4 bg-surface-alt rounded" />
                </div>
                <div className="pt-4 mt-auto border-t border-border flex justify-between">
                  <div className="h-4 w-24 bg-surface-alt rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
