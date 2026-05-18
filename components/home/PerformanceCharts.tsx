'use client'

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { BarChart2, Wifi } from 'lucide-react'
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

// A chart is only meaningful when there are ≥ 3 data points with real values
function hasEnoughChartData(data: { impressions: number; reach: number }[]) {
  return data.filter((p) => p.impressions > 0 || p.reach > 0).length >= 3
}

function ChartEmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl py-10"
      style={{ backgroundColor: 'var(--muted)', border: '1px dashed var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
      >
        <Wifi size={18} style={{ color: 'var(--accent)' }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{title}</p>
      <p className="text-xs text-center max-w-xs" style={{ color: 'var(--muted-foreground)' }}>{message}</p>
    </div>
  )
}

export function PerformanceCharts({ stats: s }: PerformanceChartsProps) {
  const showAreaChart = hasEnoughChartData(s.chartData)
  const showBarChart  = s.interactionsData.length >= 3

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-5">
      {/* Alcance & Visibilidad */}
      <div className="rounded-2xl p-5 card-lift" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Alcance &amp; Visibilidad
          </p>
          {showAreaChart && (
            <div className="flex items-center gap-4">
              {[{ label: 'Impresiones', color: 'var(--accent)' }, { label: 'Alcance', color: 'var(--warning)' }].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {showAreaChart ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={s.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gImpr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--warning)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--warning)" stopOpacity={0} />
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
                stroke="var(--warning)" strokeWidth={2} fill="url(#gReach)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState
            title="Sin datos suficientes"
            message="Conectá tu Instagram y sincronizá para ver el historial de alcance e impresiones."
          />
        )}
      </div>

      {/* Interacciones */}
      <div className="rounded-2xl p-5 card-lift" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Interacciones</p>
          {showBarChart && (
            <div className="flex items-center gap-4">
              {[
                { label: 'Me Gusta',    color: 'var(--accent)' },
                { label: 'Guardados',   color: 'var(--warning)' },
                { label: 'Comentarios', color: 'var(--chart-purple)' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {showBarChart ? (
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
              <Bar dataKey="saves"    name="Guardados"   fill="var(--warning)"        radius={[3,3,0,0]} />
              <Bar dataKey="comments" name="Comentarios" fill="var(--chart-purple)"  radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl py-8"
            style={{ backgroundColor: 'var(--muted)', border: '1px dashed var(--border)' }}>
            <BarChart2 size={22} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Las interacciones diarias aparecerán cuando haya suficientes datos
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
