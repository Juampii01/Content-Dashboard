export default function Loading() {
  return (
    <div className="flex-1 p-6 min-h-screen">
      {/* Page heading */}
      <div
        className="animate-pulse rounded-md mb-6"
        style={{ background: 'var(--muted)', height: '28px', width: '160px' }}
      />

      {/* 3 Kanban columns */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }).map((_, col) => (
          <div
            key={col}
            className="flex-1 min-w-0 rounded-xl p-3"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            {/* Column header */}
            <div
              className="animate-pulse rounded-md mb-4"
              style={{ background: 'var(--muted-foreground)', opacity: 0.2, height: '20px', width: '70%' }}
            />
            {/* 3 stacked cards */}
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, card) => (
                <div
                  key={card}
                  className="animate-pulse rounded-lg p-3 space-y-2"
                  style={{ background: 'var(--sidebar)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="rounded"
                    style={{ background: 'var(--muted)', height: '13px', width: '80%' }}
                  />
                  <div
                    className="rounded"
                    style={{ background: 'var(--muted)', height: '12px', width: '55%' }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
