'use client'

import { RefreshCw } from 'lucide-react'
import { usePeriod } from '@/hooks/usePeriod'
import type { Period } from '@/lib/types'
import { cn } from '@/lib/utils'

const PERIODS: Period[] = [7, 14, 30, 90]

export function TimeFilter() {
  const [period, setPeriod] = usePeriod()

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
              period === p ? '' : 'hover:opacity-80'
            )}
            style={{
              backgroundColor: period === p ? 'var(--accent)' : 'transparent',
              color: period === p ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
            }}>
            {p}d
          </button>
        ))}
      </div>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all hover:opacity-80"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
        <RefreshCw size={13} />
        Sincronizar
      </button>
    </div>
  )
}
