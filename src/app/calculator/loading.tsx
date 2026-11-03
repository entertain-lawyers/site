export default function CalculatorLoading() {
  return (
    <div className="w-full bg-background min-h-screen pt-6 pb-24 sm:py-16" role="status" aria-live="polite">
      <span className="sr-only">Loading calculator...</span>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        <div className="space-y-4 max-w-4xl mx-auto text-center">
          <div className="h-6 w-36 bg-surface-alt rounded-full mx-auto animate-pulse" />
          <div className="h-12 w-96 max-w-full bg-surface-alt rounded-2xl mx-auto animate-pulse" />
          <div className="h-5 w-80 max-w-full bg-surface-alt rounded-lg mx-auto animate-pulse" />
        </div>
        <div className="max-w-4xl mx-auto bg-surface border border-border rounded-3xl p-6 sm:p-10 shadow-soft animate-pulse h-96" />
      </div>
    </div>
  );
}
