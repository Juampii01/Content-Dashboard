'use client'

import { DollarSign, TrendingUp, Target, MousePointerClick, Eye, Users, Activity, Layers, Coins, Percent, Megaphone, Flame } from 'lucide-react'
import type { AdCampaignRow } from '@/hooks/useAdsData'

function fmt(n: number): string {
  if (!isFinite(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(Math.round(n))
}
const money = (n: number) => '$' + (isFinite(n) ? (n >= 1000 ? fmt(n) : n.toFixed(2)) : '0')
const pct = (n: number) => (isFinite(n) ? n : 0).toFixed(2) + '%'

function Card({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: accent ?? 'var(--muted-foreground)' }} />
        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      </div>
      <div className="text-xl font-bold text-[var(--foreground)] tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{sub}</div>}
    </div>
  )
}

export function AdsMetricsGrid({ campaigns }: { campaigns: AdCampaignRow[] }) {
  if (!campaigns.length) return null
  const n = campaigns.length

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalImpr = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalReach = campaigns.reduce((s, c) => s + c.reach, 0)
  const totalConv = campaigns.reduce((s, c) => s + c.conversions, 0)
  // ROAS ponderado por spend (revenue estimado = spend * roas)
  const totalRevenue = campaigns.reduce((s, c) => s + c.spend * c.roas, 0)

  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const cpa = totalConv > 0 ? totalSpend / totalConv : 0
  const ctr = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const cpm = totalImpr > 0 ? (totalSpend / totalImpr) * 1000 : 0
  const convRate = totalClicks > 0 ? (totalConv / totalClicks) * 100 : 0
  const activeCount = campaigns.filter((c) => c.status.toUpperCase() === 'ACTIVE').length

  const best = [...campaigns].sort((a, b) => b.roas - a.roas)[0]

  const cards: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: string }[] = [
    { icon: DollarSign, label: 'Inversión total', value: money(totalSpend), sub: `${n} campañas`, accent: '#0866FF' },
    { icon: TrendingUp, label: 'ROAS', value: roas.toFixed(2) + 'x', sub: 'retorno por $ invertido', accent: roas >= 2 ? '#16a34a' : roas >= 1 ? '#FCB045' : '#FD1D1D' },
    { icon: Target, label: 'Conversiones', value: fmt(totalConv), sub: totalConv > 0 ? `${pct(convRate)} de clicks` : 'sin conversiones' },
    { icon: Coins, label: 'CPA', value: totalConv > 0 ? money(cpa) : 'n/d', sub: 'costo por conversión', accent: '#0866FF' },
    { icon: Percent, label: 'CTR', value: pct(ctr), sub: 'clicks / impresiones' },
    { icon: MousePointerClick, label: 'CPC', value: money(cpc), sub: 'costo por click' },
    { icon: Activity, label: 'CPM', value: money(cpm), sub: 'costo por 1.000 impr.' },
    { icon: Eye, label: 'Impresiones', value: fmt(totalImpr), sub: `${fmt(totalClicks)} clicks` },
    { icon: Users, label: 'Alcance', value: fmt(totalReach), sub: 'personas únicas' },
    { icon: Megaphone, label: 'Campañas activas', value: `${activeCount}/${n}`, sub: 'corriendo ahora' },
    { icon: Flame, label: 'Mejor campaña', value: best ? best.roas.toFixed(2) + 'x' : '—', sub: best ? (best.name || 'sin nombre').slice(0, 24) : undefined, accent: '#16a34a' },
    { icon: Layers, label: 'Spend / campaña', value: money(totalSpend / n), sub: 'promedio' },
  ]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
        <Flame size={15} className="text-[var(--muted-foreground)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Métricas detalladas</span>
        <span className="text-xs text-[var(--muted-foreground)] ml-auto">sobre {n} campañas</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {cards.map((c, i) => (
          <Card key={i} {...c} />
        ))}
      </div>
    </div>
  )
}
