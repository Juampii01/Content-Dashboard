import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex-1 p-6 min-h-screen">
      {/* Page heading + connect action */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Tabs (Dashboard, Videos, Audiencia) */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 flex-shrink-0" />
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Chart */}
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
