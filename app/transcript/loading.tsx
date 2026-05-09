import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton matches the actual TranscriptView layout:
 *   PageHeader  →  URL form  →  history list
 * so the layout doesn't shift when content arrives.
 */
export default function Loading() {
  return (
    <div className="page-shell flex-1 min-h-screen" style={{ maxWidth: '64rem' }}>
      {/* PageHeader */}
      <header className="mb-8">
        <Skeleton className="mb-2" style={{ height: 11, width: 80 }} />
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="rounded-xl" style={{ height: 40, width: 40 }} />
          <Skeleton style={{ height: 30, width: 180 }} />
        </div>
        <Skeleton style={{ height: 14, width: 360 }} />
      </header>

      {/* URL form */}
      <div className="surface-elevated p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="rounded-xl flex-1" style={{ height: 44 }} />
          <Skeleton className="rounded-xl" style={{ height: 44, width: 140 }} />
        </div>
      </div>

      {/* History list */}
      <Skeleton className="mb-3" style={{ height: 11, width: 70 }} />
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
          >
            <Skeleton className="rounded-full" style={{ height: 22, width: 78, animationDelay: `${i * 60}ms` }} />
            <div className="flex-1 space-y-1.5">
              <Skeleton style={{ height: 14, width: '60%', animationDelay: `${i * 60}ms` }} />
              <Skeleton style={{ height: 11, width: '35%', animationDelay: `${i * 60}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
