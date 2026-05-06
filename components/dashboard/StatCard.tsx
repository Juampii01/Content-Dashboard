interface Props {
  label: string
  value: string
  sub?: string
  trend?: string
  trendUp?: boolean
  icon?: React.ReactNode
}

export function StatCard({ label, value, sub, trend, trendUp, icon }: Props) {
  return (
    <div className="rounded-xl p-5 flex flex-col justify-between h-full"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
        {icon && <span style={{ color: 'var(--muted-foreground)' }}>{icon}</span>}
      </div>
      <div>
        <p className="text-3xl font-bold mt-3 tabular-nums" style={{ color: 'var(--foreground)' }}>{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{sub}</p>}
        {trend && (
          <p className="text-xs mt-2 font-medium" style={{ color: trendUp ? '#8A7A4A' : '#A63A4B' }}>
            {trendUp ? '↗' : '↘'} {trend}
          </p>
        )}
      </div>
    </div>
  )
}
