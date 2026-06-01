'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  CartesianGrid,
} from 'recharts'
import { useMonthlyInsights } from '@/hooks/useAdsData'
import { META_BLUE, META_GREEN, fmtSpend, fmtPct } from './ads-theme'

interface CustomTooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'spend' ? fmtSpend(p.value) : fmtPct(p.value)}
          <span className="ml-1 text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
            {p.name === 'spend' ? 'Gasto' : 'CTR'}
          </span>
        </p>
      ))}
    </div>
  )
}

interface AdsPerformanceChartProps {
  fullWidth?: boolean
}

export function AdsPerformanceChart({ fullWidth = false }: AdsPerformanceChartProps) {
  const { data, loading } = useMonthlyInsights()

  if (loading) {
    return (
      <div
        className="rounded-xl p-5 animate-pulse"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', height: 280 }}
      >
        <div className="h-4 w-40 rounded mb-4" style={{ backgroundColor: 'var(--muted)' }} />
        <div className="h-48 rounded" style={{ backgroundColor: 'var(--muted)' }} />
      </div>
    )
  }

  if (!data.length) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Sin datos mensuales disponibles. Sincroniza tus campañas para ver el rendimiento histórico.
        </p>
      </div>
    )
  }

  // Derive CTR from monthly data (clicks/impressions * 100)
  const chartData = data.map((d) => ({
    ...d,
    ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
  }))

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Rendimiento mensual
        </p>
        <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: META_BLUE }} />
            Gasto
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-1 rounded" style={{ backgroundColor: META_GREEN }} />
            CTR
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={fullWidth ? 280 : 220}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="spend"
            orientation="left"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => fmtSpend(v)}
            width={56}
          />
          <YAxis
            yAxisId="ctr"
            orientation="right"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => fmtPct(v)}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar yAxisId="spend" dataKey="spend" fill={META_BLUE} radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Line
            yAxisId="ctr"
            type="monotone"
            dataKey="ctr"
            stroke={META_GREEN}
            strokeWidth={2}
            dot={{ fill: META_GREEN, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
