import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex-1 p-6 min-h-screen">
      {/* Page heading */}
      <Skeleton className="mb-6 h-7 w-40" />

      {/* Tabs row (Resumen, Meta Ads, TikTok Ads, Creativos) */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 flex-shrink-0" />
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Chart area */}
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
