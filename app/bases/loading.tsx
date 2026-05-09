import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="page-shell flex-1 min-h-screen">
      <Skeleton className="mb-6" style={{ height: 28, width: 140 }} />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className="rounded-lg"
            style={{
              height: 34,
              width: i === 0 ? 80 : 70,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>
      <div className="surface rounded-xl p-5 space-y-3" style={{ minHeight: 220 }}>
        {[85, 95, 70, 90, 60, 80, 50].map((w, i) => (
          <Skeleton
            key={i}
            style={{ height: 13, width: `${w}%`, animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
