export default function SemestersLoading() {
  return (
    <div className="bg-background min-h-screen pb-20" role="status" aria-live="polite">
      <span className="sr-only">Loading semesters...</span>
      <div className="bg-surface border-b border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="h-9 w-60 bg-surface-alt rounded-xl animate-pulse" />
          <div className="h-5 w-96 max-w-full bg-surface-alt rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="h-40 bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between animate-pulse">
              <div className="w-10 h-10 bg-surface-alt rounded-xl" />
              <div className="h-5 w-3/4 bg-surface-alt rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
