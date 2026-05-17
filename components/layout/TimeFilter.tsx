'use client'

import { usePeriod } from '@/hooks/usePeriod'
import type { Period } from '@/lib/types'

const PERIODS: { value: Period; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 0, label: 'Todo' },
]

export function TimeFilter() {
  const [period, setPeriod] = usePeriod()

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-0.5 p-1 rounded-xl"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {PERIODS.map(({ value, label }) => {
          const active = period === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className="relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              style={{
                color: active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                backgroundColor: active ? 'var(--accent)' : 'transparent',
                boxShadow: active ? 'var(--shadow-card-sm)' : 'none',
              }}
              aria-pressed={active}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
