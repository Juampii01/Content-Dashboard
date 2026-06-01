'use client'

import { DollarSign, Eye, MousePointer, TrendingUp, Repeat2, CheckCircle2 } from 'lucide-react'
import { type AdsAccountSummary } from '@/hooks/useAdsData'
import { META_BLUE, fmtSpend, fmtNum, fmtPct } from './ads-theme'

interface AdsOverviewStatsProps {
  stats: AdsAccountSummary['stats']
}

interface KpiCardProps {
  icon: React.ElementType
  label: string
  value: string
  highlight?: boolean
  iconColor?: string
  iconBg?: string
}

function KpiCard({ icon: Icon, label, value, highlight, iconColor, iconBg }: KpiCardProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--card)',
        border: highlight ? `1px solid ${META_BLUE}30` : '1px solid var(--border)',
        boxShadow: highlight ? `0 0 0 1px ${META_BLUE}15` : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: iconBg ?? `${META_BLUE}12` }}
        >
          <Icon size={14} style={{ color: iconColor ?? META_BLUE }} />
        </div>
      </div>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: highlight ? META_BLUE : 'var(--foreground)' }}
      >
        {value}
      </p>
    </div>
  )
}

export function AdsOverviewStats({ stats }: AdsOverviewStatsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 animate-pulse"
            style={{ backgroundColor: 'var(--muted)', height: 96, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    )
  }

  const cpc = stats.clicks > 0 ? stats.spend / stats.clicks : 0

  const kpis: KpiCardProps[] = [
    {
      icon: DollarSign,
      label: 'Gasto total',
      value: fmtSpend(stats.spend),
      highlight: true,
    },
    {
      icon: Eye,
      label: 'Impresiones',
      value: fmtNum(stats.impressions),
    },
    {
      icon: MousePointer,
      label: 'Clics',
      value: fmtNum(stats.clicks),
    },
    {
      icon: TrendingUp,
      label: 'CTR promedio',
      value: fmtPct(stats.avgCtr),
    },
    {
      icon: Repeat2,
      label: 'ROAS',
      value: stats.avgRoas > 0 ? `${stats.avgRoas.toFixed(1)}x` : '—',
      iconColor: stats.avgRoas >= 3 ? '#22c55e' : stats.avgRoas >= 1 ? '#f59e0b' : '#ef4444',
      iconBg: stats.avgRoas >= 3 ? '#22c55e15' : stats.avgRoas >= 1 ? '#f59e0b15' : '#ef444415',
    },
    {
      icon: CheckCircle2,
      label: 'Conversiones',
      value: fmtNum(stats.conversions),
      iconColor: '#22c55e',
      iconBg: '#22c55e12',
    },
  ]

  // Add CPC as a 7th if we have data — or replace last if desired
  // For now keep 6 KPIs as specified; inject CPC as sub-value into Clics card visually
  void cpc // keep for future use

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  )
}
