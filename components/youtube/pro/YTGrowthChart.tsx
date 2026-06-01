'use client'

import { TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useYouTubeSnapshots } from '@/hooks/useYouTubeData'
import { fmtSubs, fmtViews, YT_RED } from './yt-theme'

interface TooltipPayloadItem {
  name?: string
  value?: number
  color?: string
  dataKey?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === 'subscribers'
            ? `${fmtSubs(p.value ?? 0)} suscriptores`
            : `${fmtViews(p.value ?? 0)} vistas`}
        </p>
      ))}
    </div>
  )
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function YTGrowthChart() {
  const { snapshots, loading } = useYouTubeSnapshots(true, 90)

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

  const chartData = snapshots.map((s) => ({
    date: shortDate(s.date),
    subscribers: s.subscribers,
    totalViews: s.totalViews,
  }))

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          <TrendingUp className="w-4 h-4" style={{ color: YT_RED }} />
          Crecimiento del canal
        </p>
        {chartData.length > 0 && (
          <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-1 rounded" style={{ backgroundColor: YT_RED }} />
              Suscriptores
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-1 rounded" style={{ backgroundColor: 'var(--muted-foreground)' }} />
              Vistas
            </span>
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-center">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Sin historial todavía. Sincronizá tu canal varios días para ver la tendencia de crecimiento.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              yAxisId="subs"
              orientation="left"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => fmtSubs(v)}
              width={48}
            />
            <YAxis
              yAxisId="views"
              orientation="right"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => fmtViews(v)}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              yAxisId="subs"
              type="monotone"
              dataKey="subscribers"
              stroke={YT_RED}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              yAxisId="views"
              type="monotone"
              dataKey="totalViews"
              stroke="var(--muted-foreground)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
