export default function Loading() {
  return (
    <div className="flex-1 p-6 min-h-screen max-w-3xl mx-auto">
      {/* Page heading */}
      <div
        className="animate-pulse rounded-md mb-8"
        style={{ background: 'var(--muted)', height: '28px', width: '200px' }}
      />

      {/* Large input placeholder */}
      <div
        className="animate-pulse rounded-xl mb-8"
        style={{ background: 'var(--muted)', height: '56px', width: '100%', border: '1px solid var(--border)' }}
      />

      {/* 3 result cards */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl p-4 space-y-3"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <div
              className="rounded"
              style={{ background: 'var(--muted-foreground)', opacity: 0.2, height: '15px', width: '45%' }}
            />
            <div
              className="rounded"
              style={{ background: 'var(--muted-foreground)', opacity: 0.15, height: '12px', width: '90%' }}
            />
            <div
              className="rounded"
              style={{ background: 'var(--muted-foreground)', opacity: 0.12, height: '12px', width: '70%' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
