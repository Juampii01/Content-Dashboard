import { Skeleton } from '@/components/ui/skeleton'

/**
 * Mirrors ContentResearchView: PageHeader + URL/timeframe/submit form +
 * a history of research panels (each one a 3-col video card grid).
 */
export default function Loading() {
  return (
    <div className="page-shell flex-1 min-h-screen" style={{ maxWidth: '76rem' }}>
      {/* PageHeader */}
      <header className="mb-8">
        <Skeleton className="mb-2" style={{ height: 11, width: 80 }} />
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="rounded-xl" style={{ height: 40, width: 40 }} />
          <Skeleton style={{ height: 30, width: 240 }} />
        </div>
        <Skeleton style={{ height: 14, width: 420 }} />
      </header>

      {/* Form: channel URL + timeframe + submit */}
      <div className="surface-elevated p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="rounded-xl flex-1" style={{ height: 44 }} />
          <Skeleton className="rounded-xl" style={{ height: 44, width: 110 }} />
          <Skeleton className="rounded-xl" style={{ height: 44, width: 130 }} />
        </div>
      </div>

      {/* Research panels (top 5 grid) */}
      <Skeleton className="mb-3" style={{ height: 11, width: 70 }} />
      <div className="grid gap-4">
        {Array.from({ length: 2 }).map((_, panelIdx) => (
          <div
            key={panelIdx}
            className="rounded-2xl p-5"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="rounded-full" style={{ height: 14, width: 14 }} />
              <div className="flex-1 space-y-1.5">
                <Skeleton style={{ height: 16, width: 200 }} />
                <Skeleton style={{ height: 11, width: 140 }} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <Skeleton style={{ aspectRatio: '16/9', borderRadius: 0, animationDelay: `${(panelIdx * 3 + i) * 70}ms` }} />
                  <div className="p-4 space-y-2">
                    <Skeleton style={{ height: 13, width: '85%' }} />
                    <Skeleton style={{ height: 11, width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
