import { Skeleton } from '@/components/ui/skeleton'

// Skeleton for /ai — mimics EternityAIContent layout: chat area + conversation
// sidebar. Prevents a blank screen on first navigation while
// `/api/ai/conversations` is being fetched.
export default function Loading() {
  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="rounded-full" style={{ height: 40, width: 40 }} />
          <Skeleton style={{ height: 24, width: 160 }} />
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="rounded-2xl" style={{ height: 64, width: '75%' }} />
          <div className="ml-auto" style={{ width: '66%' }}>
            <Skeleton className="rounded-2xl" style={{ height: 80, animationDelay: '80ms' }} />
          </div>
          <Skeleton className="rounded-2xl" style={{ height: 56, width: '80%', animationDelay: '160ms' }} />
        </div>
        <Skeleton className="mt-4 rounded-xl" style={{ height: 56 }} />
      </div>
      <aside
        className="hidden w-72 flex-shrink-0 flex-col gap-2 p-3 md:flex"
        style={{ borderLeft: '1px solid var(--border)' }}
      >
        <Skeleton className="rounded-xl" style={{ height: 40 }} />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="rounded-lg"
              style={{ height: 48, animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </aside>
    </div>
  )
}
