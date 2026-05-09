'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import type { DashboardStats } from '@/lib/types'
import { useCountUp } from '@/lib/hooks/useCountUp'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K'
  return String(n)
}

/** Animated SVG ring that fills from 0 → pct on mount */
function RingProgress({ pct, color, size = 72 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const [animPct, setAnimPct] = useState(0)

  useEffect(() => {
    // Small delay so the CSS transition fires after initial render
    const t = setTimeout(() => setAnimPct(pct), 80)
    return () => clearTimeout(t)
  }, [pct])

  const dash = (animPct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease-out' }}
      />
    </svg>
  )
}

interface QuickSummarySidebarProps {
  stats: DashboardStats
}

export function QuickSummarySidebar({ stats: s }: QuickSummarySidebarProps) {
  const animatedReach     = useCountUp(s.avgDailyReach)
  const animatedVisits    = useCountUp(s.profileVisits)
  const animatedFollowers = useCountUp(s.newFollowers)
  const animatedBestReel  = useCountUp(s.bestReelViews)
  // Engagement: animate as integer tenths then divide
  const animatedEngRaw    = useCountUp(Math.round(s.engagementRate * 10))
  const animatedEng       = (animatedEngRaw / 10).toFixed(1)

  const summaryRows = [
    { label: 'Alcance promedio/día', value: fmt(animatedReach) },
    { label: 'Visitas al perfil',    value: fmt(animatedVisits) },
    { label: 'Nuevos seguidores',    value: `+${fmt(animatedFollowers)}` },
    { label: 'Mejor reel',           value: fmt(animatedBestReel) + ' vistas' },
  ]

  return (
    <div className="flex flex-col gap-4 w-full xl:w-64 xl:flex-shrink-0">
      {/* Resumen rápido */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Resumen Rápido</p>
        <div className="flex flex-col gap-3">
          {summaryRows.map(({ label, value }, i) => (
            <motion.div
              key={label}
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{value}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Metas del mes — rings animados */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Metas del Mes</p>
        <div className="flex justify-around">
          {[
            { label: 'Vistas',     pct: s.viewsGoalPct,     color: 'var(--accent)' },
            { label: 'Seguidores', pct: s.followersGoalPct, color: 'var(--stat-icon)' },
          ].map(({ label, pct, color }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="relative flex items-center justify-center">
                <RingProgress pct={pct} color={color} size={72} />
                <span className="absolute text-sm font-bold" style={{ color: 'var(--foreground)' }}>{pct}%</span>
              </div>
              <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement rate — número animado */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
          Engagement Rate
        </p>
        <p className="text-3xl font-bold tabular-nums mb-1" style={{ color: 'var(--stat-icon)' }}>{animatedEng}%</p>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Promedio del período seleccionado</p>
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-full rounded-full"
            style={{ width: `${Math.min(s.engagementRate * 10, 100)}%`, backgroundColor: 'var(--stat-icon)' }} />
        </div>
      </div>

      {/* Tráfico */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
          Origen del Tráfico
        </p>
        <div className="flex flex-col gap-2.5">
          {[
            { label: 'Orgánico', pct: s.trafficOrganic, color: 'var(--accent)' },
            { label: 'Pago',     pct: s.trafficPaid,    color: 'var(--stat-icon)' },
          ].map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
