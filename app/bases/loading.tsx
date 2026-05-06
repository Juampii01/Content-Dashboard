export default function Loading() {
  return (
    <div className="flex-1 p-6 min-h-screen">
      {/* Page heading */}
      <div
        className="animate-pulse rounded-md mb-6"
        style={{ background: 'var(--muted)', height: '28px', width: '140px' }}
      />

      {/* Tabs row — 5 tabs */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg"
            style={{
              background: 'var(--muted)',
              height: '34px',
              width: i === 0 ? '80px' : '70px',
            }}
          />
        ))}
      </div>

      {/* Content block — multi-line text skeleton */}
      <div
        className="animate-pulse rounded-xl p-5 space-y-3"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)', minHeight: '220px' }}
      >
        {[85, 95, 70, 90, 60, 80, 50].map((w, i) => (
          <div
            key={i}
            className="rounded"
            style={{ background: 'var(--muted-foreground)', opacity: 0.15, height: '13px', width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  )
}
