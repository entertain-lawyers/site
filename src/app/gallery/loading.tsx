export default function Loading() {
  const heights = ['h-64', 'h-72', 'h-56', 'h-60', 'h-72', 'h-64'];

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
          <div className="h-10 sm:h-12 w-64 sm:w-80 bg-surface-alt animate-pulse rounded-xl mb-4" />
          <div className="h-5 w-full max-w-lg bg-surface-alt animate-pulse rounded-lg mb-2" />
          <div className="h-5 w-3/4 max-w-md bg-surface-alt animate-pulse rounded-lg" />
        </div>

        {/* 6 Image Placeholder Skeletons in Masonry-Style Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {heights.map((heightClass, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col"
            >
              {/* Image placeholder with varying height */}
              <div className={`w-full ${heightClass} bg-surface-alt animate-pulse border-b border-border relative`}>
                <div className="absolute bottom-4 left-4 h-6 w-24 bg-surface-alt animate-pulse rounded-full opacity-80" />
              </div>

              {/* Card Body */}
              <div className="p-6 flex flex-col flex-1">
                <div className="h-6 w-4/5 bg-surface-alt animate-pulse rounded-lg mb-3" />
                <div className="h-4 w-full bg-surface-alt animate-pulse rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
