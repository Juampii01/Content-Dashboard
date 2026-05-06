export default function Loading() {
  return (
    <div className="flex-1 p-6 min-h-screen">
      {/* Tabs bar */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg flex-shrink-0"
            style={{
              background: 'var(--muted)',
              height: '36px',
              width: i === 0 ? '100px' : '90px',
            }}
          />
        ))}
      </div>

      {/* 2x3 card grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            {/* Image placeholder */}
            <div
              className="w-full"
              style={{ background: 'var(--muted)', height: '140px' }}
            />
            {/* Text lines */}
            <div className="p-3 space-y-2">
              <div
                className="animate-pulse rounded"
                style={{ background: 'var(--muted)', height: '13px', width: '75%' }}
              />
              <div
                className="animate-pulse rounded"
                style={{ background: 'var(--muted)', height: '12px', width: '50%' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
