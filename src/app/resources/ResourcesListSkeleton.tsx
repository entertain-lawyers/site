export default function ResourcesListSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading study resources...</span>
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
  );
}
