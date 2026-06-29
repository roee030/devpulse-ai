// src/components/ui/PageSkeleton.tsx
function Shimmer({ className }: { className: string }) {
  return (
    <div className={`bg-border/40 rounded-lg animate-pulse ${className}`} />
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="space-y-2">
        <Shimmer className="h-7 w-56" />
        <Shimmer className="h-4 w-40" />
      </div>

      {/* Insight card */}
      <Shimmer className="h-14 w-full rounded-xl" />

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-8 w-16" />
            <Shimmer className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Table / list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
            <Shimmer className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-3 w-32" />
              <Shimmer className="h-3 w-48" />
            </div>
            <Shimmer className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
