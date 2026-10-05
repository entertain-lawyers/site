export default function Loading() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
          <div className="h-10 sm:h-12 w-48 sm:w-64 bg-surface-alt animate-pulse rounded-xl mb-4" />
          <div className="h-5 w-full max-w-lg bg-surface-alt animate-pulse rounded-lg mb-2" />
          <div className="h-5 w-3/4 max-w-md bg-surface-alt animate-pulse rounded-lg" />
        </div>

        {/* 4 Event Card Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col"
            >
              {/* Image placeholder (h-48) */}
              <div className="w-full h-48 bg-surface-alt animate-pulse border-b border-border" />

              {/* Card Body */}
              <div className="p-6 sm:p-8 flex flex-col flex-1">
                <div className="flex-1">
                  {/* Title */}
                  <div className="h-6 w-5/6 bg-surface-alt animate-pulse rounded-lg mb-4" />

                  {/* Date and Location */}
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-surface-alt animate-pulse shrink-0" />
                      <div className="h-4 w-28 bg-surface-alt animate-pulse rounded-md" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-surface-alt animate-pulse shrink-0" />
                      <div className="h-4 w-36 bg-surface-alt animate-pulse rounded-md" />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2 mb-4">
                    <div className="h-4 w-full bg-surface-alt animate-pulse rounded-md" />
                    <div className="h-4 w-4/5 bg-surface-alt animate-pulse rounded-md" />
                  </div>
                </div>

                {/* View Event link */}
                <div className="mt-6 pt-2">
                  <div className="h-4 w-28 bg-surface-alt animate-pulse rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
