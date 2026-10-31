// Shown inside the admin shell (sidebar stays put) while a section's server
// data loads, so switching sections responds instantly instead of freezing
// on the previous page.
export default function AdminLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mb-8 space-y-3">
        <div className="h-8 w-56 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 animate-pulse"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 p-6 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className={`h-3.5 rounded bg-black/5 dark:bg-white/5 animate-pulse ${i % 2 ? 'w-1/2' : 'w-2/3'}`} />
              <div className="h-3 w-1/4 rounded bg-black/5 dark:bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
