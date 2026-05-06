import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
