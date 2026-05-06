'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Hash, Clock, Timer } from 'lucide-react'
import {
  TRENDING_HASHTAGS,
  BEST_HOURS,
  OPTIMAL_DURATIONS,
} from '@/lib/mock-data/tiktok'
import { formatK } from '@/lib/utils/formatters'

export function TikTokTendenciasTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">

        {/* Trending hashtags */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Hash size={14} style={{ color: 'var(--accent)' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              HASHTAGS TENDENCIA
            </p>
          </div>
          <div className="space-y-3">
            {TRENDING_HASHTAGS.map((h, i) => (
              <div key={h.tag} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-[10px] font-bold w-4 text-right flex-shrink-0"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {h.tag}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                    {formatK(h.views)}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: h.growth >= 30 ? 'var(--accent)' : 'var(--muted)',
                      color: h.growth >= 30 ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                    }}
                  >
                    +{h.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mejores horas */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} style={{ color: 'var(--accent)' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              MEJORES HORAS PARA PUBLICAR
            </p>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BEST_HOURS} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <XAxis
                  dataKey="hour"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v}`}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v: unknown) => [`${v} pts`, 'Engagement']}
                />
                <Bar dataKey="engagementScore" radius={[3, 3, 0, 0]}>
                  {BEST_HOURS.map((h) => (
                    <Cell
                      key={h.hour}
                      fill={h.engagementScore >= 90 ? 'var(--accent)' : '#B08A4A'}
                      opacity={h.engagementScore >= 70 ? 1 : 0.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--muted-foreground)' }}>
            Hora óptima: <span style={{ color: 'var(--foreground)' }}>8:00 PM</span>
          </p>
        </div>

        {/* Duración óptima */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Timer size={14} style={{ color: 'var(--accent)' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              DURACIÓN ÓPTIMA DE VIDEOS
            </p>
          </div>
          <div className="space-y-4">
            {OPTIMAL_DURATIONS.map((d, i) => {
              const maxViews = OPTIMAL_DURATIONS[0].avgViews
              const pct = Math.round((d.avgViews / maxViews) * 100)
              return (
                <div key={d.range}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{d.range}</span>
                      <span className="ml-2" style={{ color: 'var(--muted-foreground)' }}>{d.label}</span>
                    </div>
                    <span className="font-semibold tabular-nums" style={{ color: i === 0 ? 'var(--accent)' : '#B08A4A' }}>
                      {formatK(d.avgViews)}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--muted)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: i === 0 ? 'var(--accent)' : '#B08A4A',
                        opacity: i === 0 ? 1 : 0.7,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--muted-foreground)' }}>
            Promedio de vistas por rango de duración (últimos 90 días)
          </p>
        </div>
      </div>
    </div>
  )
}
