export default function ResourceDetailLoading() {
  return (
    <div className="bg-background min-h-screen py-10" role="status" aria-live="polite">
      <span className="sr-only">Loading resource...</span>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="h-4 w-32 bg-surface-alt rounded animate-pulse mb-6" />
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-pulse">
          <div className="space-y-3">
            <div className="h-8 w-full bg-surface-alt rounded-xl" />
            <div className="h-8 w-2/3 bg-surface-alt rounded-xl" />
          </div>
          <div className="flex gap-4">
            <div className="h-6 w-24 bg-surface-alt rounded-full" />
            <div className="h-6 w-32 bg-surface-alt rounded-full" />
          </div>
          <div className="aspect-video w-full bg-slate-100 dark:bg-zinc-800 rounded-xl" />
          <div className="space-y-3 pt-4">
            <div className="h-4 w-full bg-surface-alt rounded" />
            <div className="h-4 w-5/6 bg-surface-alt rounded" />
            <div className="h-4 w-4/6 bg-surface-alt rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
