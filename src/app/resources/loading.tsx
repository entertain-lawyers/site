import { Library } from 'lucide-react';

export default function ResourcesLoading() {
  return (
    <div className="bg-background min-h-screen pb-20">
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-surface-alt rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
            </div>
            <div className="flex flex-col gap-2 w-full">
              <div className="h-10 bg-surface-alt rounded-lg w-1/4 animate-pulse"></div>
              <div className="h-6 bg-surface-alt rounded-lg w-1/3 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="group flex flex-col justify-between h-full p-6 bg-surface border border-border rounded-2xl animate-pulse h-64">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="w-24 h-6 bg-surface-alt rounded-md"></div>
                <div className="w-16 h-6 bg-surface-alt rounded-md"></div>
              </div>
              <div className="w-3/4 h-6 bg-surface-alt rounded-md mb-3"></div>
              <div className="mt-auto space-y-4">
                <div className="w-full h-4 bg-surface-alt rounded-md"></div>
                <div className="pt-4 border-t border-border flex justify-between">
                  <div className="w-20 h-4 bg-surface-alt rounded-md"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
