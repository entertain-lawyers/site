export default function Loading() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
          <div className="h-10 sm:h-12 w-64 sm:w-80 bg-surface-alt animate-pulse rounded-xl mb-4" />
          <div className="h-5 w-full max-w-lg bg-surface-alt animate-pulse rounded-lg mb-2" />
          <div className="h-5 w-3/4 max-w-md bg-surface-alt animate-pulse rounded-lg" />
        </div>

        {/* 6 Cards in 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col"
            >
              {/* Image placeholder (h-48) */}
              <div className="w-full h-48 bg-surface-alt animate-pulse border-b border-border" />

              {/* Card Content */}
              <div className="p-6 sm:p-8 flex flex-col flex-1">
                <div className="flex-1">
                  {/* Type badge */}
                  <div className="h-4 w-20 bg-surface-alt animate-pulse rounded-md mb-3" />
                  {/* Title lines */}
                  <div className="h-6 w-11/12 bg-surface-alt animate-pulse rounded-lg mb-2" />
                  <div className="h-6 w-2/3 bg-surface-alt animate-pulse rounded-lg mb-4" />
                </div>

                {/* Read more link */}
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
