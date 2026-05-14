'use client'

import { usePeriod } from '@/hooks/usePeriod'
import type { Period } from '@/lib/types'

const PERIODS: Period[] = [7, 14, 30, 90]

export function TimeFilter() {
  const [period, setPeriod] = usePeriod()

  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {PERIODS.map((p) => {
        const active = period === p
        return (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className="relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            style={{
              color: active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
              backgroundColor: active ? 'var(--accent)' : 'transparent',
              boxShadow: active ? 'var(--shadow-card-sm)' : 'none',
            }}
            aria-pressed={active}
          >
            {p}d
          </button>
        )
      })}
    </div>
  )
}
