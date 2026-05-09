import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="page-shell flex-1 min-h-screen">
      <Skeleton className="mb-6" style={{ height: 28, width: 160 }} />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="flex-1 min-w-0 surface rounded-xl p-3">
            <Skeleton className="mb-4" style={{ height: 20, width: '70%' }} />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, card) => (
                <div
                  key={card}
                  className="rounded-lg p-3 space-y-2"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <Skeleton style={{ height: 13, width: '80%' }} />
                  <Skeleton style={{ height: 12, width: '55%' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
