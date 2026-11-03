export default function SemesterDetailLoading() {
  return (
    <div className="bg-background min-h-screen pb-20" role="status" aria-live="polite">
      <span className="sr-only">Loading semester details...</span>
      <div className="bg-surface border-b border-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="h-4 w-32 bg-surface-alt rounded animate-pulse" />
          <div className="h-9 w-64 bg-surface-alt rounded-xl animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-surface-alt rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-24 bg-surface-alt/50 border border-border/50 rounded-xl p-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
