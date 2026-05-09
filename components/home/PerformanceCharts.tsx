'use client'

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DashboardStats } from '@/lib/types'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K'
  return String(n)
}

interface TooltipEntry { name: string; value: number; color: string }
interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }
function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString('es-ES')}
        </p>
      ))}
    </div>
  )
}

interface PerformanceChartsProps {
  stats: DashboardStats
}

export function PerformanceCharts({ stats: s }: PerformanceChartsProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-5">
      <div className="rounded-2xl p-5 card-lift" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Alcance &amp; Visibilidad
          </p>
          <div className="flex items-center gap-4">
            {[{ label: 'Impresiones', color: 'var(--accent)' }, { label: 'Alcance', color: '#B08A4A' }].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={s.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gImpr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#B08A4A" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#B08A4A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false} tickLine={false}
              interval={Math.floor(s.chartData.length / 6)} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="impressions" name="Impresiones"
              stroke="var(--accent)" strokeWidth={2} fill="url(#gImpr)" dot={false} />
            <Area type="monotone" dataKey="reach" name="Alcance"
              stroke="#B08A4A" strokeWidth={2} fill="url(#gReach)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl p-5 card-lift" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Interacciones</p>
          <div className="flex items-center gap-4">
            {[
              { label: 'Me Gusta',    color: 'var(--accent)' },
              { label: 'Guardados',   color: '#B08A4A' },
              { label: 'Comentarios', color: '#9B7DB0' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={s.interactionsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false} tickLine={false}
              interval={Math.floor(s.interactionsData.length / 6)} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="likes"    name="Me Gusta"    fill="var(--accent)" radius={[3,3,0,0]} />
            <Bar dataKey="saves"    name="Guardados"   fill="#B08A4A"       radius={[3,3,0,0]} />
            <Bar dataKey="comments" name="Comentarios" fill="#9B7DB0"       radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
