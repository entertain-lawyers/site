export default function Loading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header Skeleton */}
      <div className="bg-surface border-b border-border pt-20 pb-24">
        <div className="text-center max-w-3xl mx-auto px-4 flex flex-col items-center">
          <div className="h-10 sm:h-12 md:h-14 w-72 sm:w-96 bg-surface-alt animate-pulse rounded-xl mb-6" />
          <div className="h-5 w-full max-w-xl bg-surface-alt animate-pulse rounded-lg mb-3" />
          <div className="h-5 w-4/5 max-w-lg bg-surface-alt animate-pulse rounded-lg" />
        </div>
      </div>

      {/* 3 Plan Cards in a Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="flex justify-center mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col shadow-soft"
              >
                {/* Plan Title */}
                <div className="h-7 w-32 bg-surface-alt animate-pulse rounded-xl mb-4" />

                {/* Price */}
                <div className="flex items-baseline mb-4 gap-2">
                  <div className="h-10 w-32 bg-surface-alt animate-pulse rounded-xl" />
                  <div className="h-5 w-16 bg-surface-alt animate-pulse rounded-md" />
                </div>

                {/* Description */}
                <div className="space-y-2 mb-8 pb-8 border-b border-border">
                  <div className="h-4 w-full bg-surface-alt animate-pulse rounded-md" />
                  <div className="h-4 w-4/5 bg-surface-alt animate-pulse rounded-md" />
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8 flex-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-surface-alt animate-pulse shrink-0" />
                      <div className="h-4 flex-1 bg-surface-alt animate-pulse rounded-md" />
                    </div>
                  ))}
                </div>

                {/* Action button */}
                <div className="h-12 w-full bg-surface-alt animate-pulse rounded-xl mt-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
