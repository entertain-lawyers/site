export default function ResourcesLoading() {
  return (
    <div className="bg-background min-h-screen pb-20" role="status" aria-live="polite">
      <span className="sr-only">Loading study resources...</span>
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-8 w-48 bg-surface-alt rounded-lg animate-pulse" />
              <div className="h-4 w-72 bg-surface-alt rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-6 bg-surface border border-border rounded-2xl flex flex-col justify-between h-56 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 w-24 bg-surface-alt rounded-md" />
                <div className="h-5 w-16 bg-surface-alt rounded-md" />
              </div>
              <div className="space-y-2 my-auto">
                <div className="h-5 w-full bg-surface-alt rounded" />
                <div className="h-5 w-2/3 bg-surface-alt rounded" />
              </div>
              <div className="pt-4 border-t border-border flex justify-between items-center">
                <div className="h-4 w-20 bg-surface-alt rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
