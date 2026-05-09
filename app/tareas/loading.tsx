import { Skeleton } from '@/components/ui/skeleton'

// Matches the 3-column layout of KanbanBoard.tsx (por-hacer | en-proceso | listo).
export default function Loading() {
  return (
    <div className="page-shell flex-1 min-h-screen">
      <Skeleton className="mb-4" style={{ height: 32, width: 144 }} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton style={{ height: 28, animationDelay: `${i * 60}ms` }} />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton
                key={j}
                className="rounded-lg"
                style={{ height: 80, animationDelay: `${(i * 3 + j) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
