import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="page-shell flex-1 min-h-screen">
      <Skeleton className="mb-6" style={{ height: 32, width: 192 }} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="rounded-xl"
            style={{ height: 112, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Skeleton className="rounded-xl" style={{ height: 256 }} />
        <Skeleton className="rounded-xl" style={{ height: 256, animationDelay: '120ms' }} />
      </div>
    </div>
  )
}
