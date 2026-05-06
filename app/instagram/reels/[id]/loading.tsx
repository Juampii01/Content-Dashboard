export default function Loading() {
  return (
    <div className="flex-1 p-6 min-h-screen">
      <div className="mb-6 h-7 w-24 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
        <div className="flex flex-col gap-4">
          <div className="h-8 w-3/4 animate-pulse rounded-md bg-muted" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  )
}
