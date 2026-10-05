export default function Loading() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
          <div className="h-10 sm:h-12 w-56 sm:w-72 bg-surface-alt animate-pulse rounded-xl mb-4" />
          <div className="h-5 w-full max-w-lg bg-surface-alt animate-pulse rounded-lg mb-2" />
          <div className="h-5 w-3/4 max-w-md bg-surface-alt animate-pulse rounded-lg" />
        </div>

        {/* 4 Publication Card Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col"
            >
              {/* Cover placeholder aspect-[3/4] */}
              <div className="w-full aspect-[3/4] bg-surface-alt animate-pulse border-b border-border" />

              {/* Card Body */}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex-1">
                  {/* Title */}
                  <div className="h-5 w-5/6 bg-surface-alt animate-pulse rounded-lg mb-3" />

                  {/* Publish Date */}
                  <div className="h-3 w-28 bg-surface-alt animate-pulse rounded-md mb-3" />

                  {/* Description */}
                  <div className="space-y-2 mb-4">
                    <div className="h-4 w-full bg-surface-alt animate-pulse rounded-md" />
                    <div className="h-4 w-4/5 bg-surface-alt animate-pulse rounded-md" />
                  </div>
                </div>

                {/* Details link */}
                <div className="mt-5 pt-5 border-t border-border flex items-center justify-between">
                  <div className="h-3 w-16 bg-surface-alt animate-pulse rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
