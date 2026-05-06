'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { formatK } from '@/lib/utils/formatters'

interface Props {
  data: { date: string; impressions: number; reach: number }[]
  impressions: number
  avgDailyReach: number
  change: number
}

export function VisitasChart({ data, impressions, avgDailyReach, change }: Props) {
  return (
    <div className="rounded-xl p-5 h-full flex flex-col"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-2"
            style={{ color: 'var(--muted-foreground)' }}>RENDIMIENTO DE VISITAS</p>
          <div className="flex items-baseline gap-4">
            <div>
              <span className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>{formatK(impressions)}</span>
              <span className="text-xs ml-2" style={{ color: 'var(--muted-foreground)' }}>IMPRESIONES</span>
            </div>
            <div>
              <span className="text-xl font-semibold" style={{ color: '#B08A4A' }}>{formatK(avgDailyReach)}</span>
              <span className="text-xs ml-2" style={{ color: 'var(--muted-foreground)' }}>ALCANCE PROM/DÍA</span>
            </div>
          </div>
        </div>
        <span className="text-sm font-semibold" style={{ color: '#8A7A4A' }}>↗ +{change}%</span>
      </div>

      <div className="flex-1 min-h-0" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradImpr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B08A4A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#B08A4A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatK} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--foreground)', fontSize: 12 }}
              itemStyle={{ fontSize: 12 }}
            />
            <Area type="monotone" dataKey="impressions" stroke="var(--accent)" strokeWidth={2} fill="url(#gradImpr)" name="Impresiones" />
            <Area type="monotone" dataKey="reach" stroke="#B08A4A" strokeWidth={1.5} fill="url(#gradReach)" name="Alcance" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
