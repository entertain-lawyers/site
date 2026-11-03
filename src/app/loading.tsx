export default function RootLoading() {
  return (
    <div className="w-full bg-background min-h-screen pb-12 sm:pb-20" role="status" aria-live="polite">
      <span className="sr-only">Loading...</span>
      <div className="pt-6 pb-6 flex flex-col items-center justify-center px-4">
        <div className="w-64 sm:w-80 h-20 bg-surface-alt rounded-2xl animate-pulse mb-4" />
        <div className="h-5 w-72 bg-surface-alt rounded-lg animate-pulse" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="w-full max-w-3xl mx-auto h-12 bg-surface-alt rounded-full animate-pulse mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 bg-surface border border-border/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
