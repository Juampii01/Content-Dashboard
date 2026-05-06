// Matches the 3-column layout of KanbanBoard.tsx (por-hacer | en-proceso | listo).
// Previous 4-column skeleton caused layout shift on hydration (ui-M03).
export default function Loading() {
  return (
    <div className="flex-1 p-6 min-h-screen">
      <div className="mb-4 h-8 w-36 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="h-7 animate-pulse rounded-md bg-muted" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
