import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="page-shell flex-1 min-h-screen">
      <Skeleton className="mb-3" style={{ height: 28, width: 200 }} />
      <Skeleton className="mb-6" style={{ height: 16, width: 320 }} />

      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className="rounded-lg flex-shrink-0"
            style={{
              height: 36,
              width: i === 0 ? 100 : 90,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <Skeleton
              style={{ height: 140, borderRadius: 0, animationDelay: `${i * 60}ms` }}
            />
            <div className="p-3 space-y-2">
              <Skeleton style={{ height: 13, width: '75%' }} />
              <Skeleton style={{ height: 12, width: '50%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
