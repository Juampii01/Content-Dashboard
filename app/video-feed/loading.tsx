import { Skeleton } from '@/components/ui/skeleton'

/**
 * Mirrors VideoFeedView's connected state: PageHeader + account banner +
 * 4-col grid of square post cards. (The disconnected state is just a small
 * connect form so the skeleton biases toward the more common case.)
 */
export default function Loading() {
  return (
    <div className="page-shell flex-1 min-h-screen">
      {/* PageHeader */}
      <header className="mb-8">
        <Skeleton className="mb-2" style={{ height: 11, width: 80 }} />
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="rounded-xl" style={{ height: 40, width: 40 }} />
          <Skeleton style={{ height: 30, width: 180 }} />
        </div>
        <Skeleton style={{ height: 14, width: 420 }} />
      </header>

      {/* Account banner */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <Skeleton className="rounded-full" style={{ height: 16, width: 16 }} />
        <div className="flex-1 space-y-1.5">
          <Skeleton style={{ height: 14, width: 160 }} />
          <Skeleton style={{ height: 11, width: 220 }} />
        </div>
      </div>

      {/* Posts grid */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
          >
            <Skeleton style={{ aspectRatio: '1/1', borderRadius: 0, animationDelay: `${i * 60}ms` }} />
            <div className="p-3 space-y-2">
              <Skeleton style={{ height: 11, width: '50%' }} />
              <Skeleton style={{ height: 11, width: '85%' }} />
              <Skeleton style={{ height: 11, width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
