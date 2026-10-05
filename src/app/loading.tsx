export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center max-w-sm w-full">
        {/* Pulsing logo placeholder */}
        <div className="w-56 h-16 bg-surface-alt animate-pulse rounded-2xl mb-8" />

        {/* Loading spinner */}
        <div className="w-10 h-10 rounded-full border-4 border-surface-alt border-t-accent animate-spin" />
      </div>
    </div>
  );
}
