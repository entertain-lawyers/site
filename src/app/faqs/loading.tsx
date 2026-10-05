export default function Loading() {
  return (
    <div className="min-h-screen bg-background py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
          <div className="w-20 h-20 bg-surface-alt animate-pulse rounded-full mx-auto mb-6" />
          <div className="h-10 sm:h-12 w-72 sm:w-96 bg-surface-alt animate-pulse rounded-xl mb-4" />
          <div className="h-5 w-full max-w-lg bg-surface-alt animate-pulse rounded-lg mb-2" />
          <div className="h-5 w-2/3 max-w-md bg-surface-alt animate-pulse rounded-lg" />
        </div>

        {/* 6 FAQ Accordion Skeletons */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl px-6 py-5 flex items-center justify-between shadow-soft"
            >
              <div className={`h-6 bg-surface-alt animate-pulse rounded-lg ${i % 2 === 0 ? 'w-3/4' : 'w-2/3'}`} />
              <div className="w-5 h-5 bg-surface-alt animate-pulse rounded-full shrink-0 ml-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
