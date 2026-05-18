'use client'

import { Eye, Heart, Users, MessageCircle, TrendingUp } from 'lucide-react'
import { motion } from 'motion/react'
import type { DashboardStats } from '@/lib/types'
import { useCountUp } from '@/lib/hooks/useCountUp'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K'
  return String(n)
}

interface AnimatedStatCardProps {
  label: string
  rawValue: number
  change: number
  icon: React.ElementType
  color: string
}

function AnimatedStatCard({ label, rawValue, change, icon: Icon, color }: AnimatedStatCardProps) {
  const animated = useCountUp(rawValue)
  const positive = change >= 0
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 min-w-0 interactive-card interactive-card--info"
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span
          className="text-xs font-semibold uppercase tracking-wider truncate min-w-0"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {label}
        </span>
        <motion.div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '22' }}
          whileHover={{ scale: 1.12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <Icon size={15} style={{ color }} />
        </motion.div>
      </div>
      <motion.p
        className="text-2xl font-bold tabular-nums truncate"
        style={{ color: 'var(--foreground)' }}
        whileHover={{ scale: [1, 1.07, 0.98, 1] }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {fmt(animated)}
      </motion.p>
      <div className="flex items-center gap-1">
        <TrendingUp
          size={11}
          style={{ color: positive ? 'var(--success)' : 'var(--destructive)', transform: positive ? 'none' : 'scaleY(-1)' }}
        />
        <span className="text-xs font-medium" style={{ color: positive ? 'var(--success)' : 'var(--destructive)' }}>
          {positive ? '+' : ''}{change}%
        </span>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>vs período anterior</span>
      </div>
    </div>
  )
}

interface StatGridProps {
  stats: DashboardStats
}

export function StatGrid({ stats: s }: StatGridProps) {
  const cards = [
    { label: 'Vistas Totales', rawValue: s.impressions,   change: s.impressionsChange,                    icon: Eye,           color: 'var(--accent)' },
    { label: 'Seguidores',     rawValue: s.profileGrowth, change: 0,                                      icon: Users,         color: 'var(--stat-icon)' },
    { label: 'Me Gusta',       rawValue: s.likes,         change: Math.round(s.impressionsChange * 0.72), icon: Heart,         color: 'var(--stat-icon-secondary)' },
    { label: 'Comentarios',    rawValue: s.comments,      change: Math.round(s.impressionsChange * 0.6),  icon: MessageCircle, color: 'var(--secondary)' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(({ label, rawValue, change, icon, color }, index) => (
        <div
          key={label}
          className="animate-slide-up-fade"
          style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
        >
          <AnimatedStatCard label={label} rawValue={rawValue} change={change} icon={icon} color={color} />
        </div>
      ))}
    </div>
  )
}
