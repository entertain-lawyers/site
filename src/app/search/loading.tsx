/**
 * Search waits on live WordPress full-text search (and the optional AI pass),
 * which can take a few seconds on a cold query. Show the page frame at once
 * instead of leaving the previous page on screen with no feedback.
 */
export default function Loading() {
  return (
    <div className="flex-grow flex flex-col w-full bg-background" aria-busy="true">
      <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy dark:text-gray-100 tracking-tight">
            Search Results
          </h1>
          <p role="status" className="text-sm text-text-muted mt-1 font-medium">
            Searching study materials, articles and publications…
          </p>
        </div>

        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl px-4 py-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-surface-alt animate-pulse rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className={`h-4 bg-surface-alt animate-pulse rounded ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
                <div className="h-3 w-1/3 bg-surface-alt animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
