import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="page-shell flex-1 min-h-screen" style={{ maxWidth: '48rem' }}>
      <Skeleton className="mb-8" style={{ height: 28, width: 200 }} />
      <Skeleton className="rounded-xl mb-8" style={{ height: 56 }} />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="surface rounded-xl p-4 space-y-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Skeleton style={{ height: 15, width: '45%' }} />
            <Skeleton style={{ height: 12, width: '90%' }} />
            <Skeleton style={{ height: 12, width: '70%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
