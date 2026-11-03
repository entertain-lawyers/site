export default function TeamLoading() {
  return (
    <div className="min-h-screen bg-background py-12 sm:py-20" role="status" aria-live="polite">
      <span className="sr-only">Loading team...</span>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="h-10 w-48 bg-surface-alt rounded-2xl mx-auto animate-pulse" />
          <div className="h-5 w-80 max-w-full bg-surface-alt rounded-lg mx-auto animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden p-6 space-y-4 animate-pulse">
              <div className="w-28 h-28 rounded-full bg-surface-alt mx-auto" />
              <div className="h-5 w-36 bg-surface-alt rounded mx-auto" />
              <div className="h-4 w-28 bg-surface-alt rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
