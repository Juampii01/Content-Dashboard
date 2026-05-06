export default function Loading() {
  return (
    <div className="flex-1 p-6 min-h-screen">
      {/* Page heading */}
      <div
        className="animate-pulse rounded-md mb-6"
        style={{ background: 'var(--muted)', height: '28px', width: '180px' }}
      />

      {/* 4 vertical cards with avatar + text */}
      <div className="flex flex-col gap-4 max-w-xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex items-center gap-4 rounded-xl p-4"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            {/* Avatar circle */}
            <div
              className="flex-shrink-0 rounded-full"
              style={{ background: 'var(--muted-foreground)', opacity: 0.15, width: '44px', height: '44px' }}
            />
            {/* Text lines */}
            <div className="flex-1 space-y-2">
              <div
                className="rounded"
                style={{ background: 'var(--muted-foreground)', opacity: 0.2, height: '14px', width: '60%' }}
              />
              <div
                className="rounded"
                style={{ background: 'var(--muted-foreground)', opacity: 0.15, height: '12px', width: '40%' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
