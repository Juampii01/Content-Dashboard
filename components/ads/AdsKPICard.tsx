import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string
  change: number
  icon?: ReactNode
  invertChange?: boolean  // when lower is better (e.g. CPC)
}

export function AdsKPICard({ label, value, change, icon, invertChange = false }: Props) {
  const positive = invertChange ? change <= 0 : change >= 0
  return (
    <div
      className="rounded-xl p-5 flex flex-col justify-between"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <p
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {label}
        </p>
        {icon && <span style={{ color: 'var(--muted-foreground)' }}>{icon}</span>}
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
          {value}
        </p>
        <p
          className="text-xs mt-2 font-medium"
          style={{ color: positive ? '#8A7A4A' : 'var(--accent)' }}
        >
          {change >= 0 ? '↗' : '↘'} {change >= 0 ? '+' : ''}{change}% vs período anterior
        </p>
      </div>
    </div>
  )
}
