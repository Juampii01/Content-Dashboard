'use client'

import { Image, Film, LayoutGrid, BarChart2, Music } from 'lucide-react'
import { AD_CREATIVES, type AdCreative, type AdsPlatform, type CampaignStatus } from '@/lib/mock-data/ads'
import { formatK, formatPercent } from '@/lib/utils/formatters'

const STATUS_STYLES: Record<CampaignStatus, { bg: string; color: string }> = {
  activa:    { bg: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' },
  pausada:   { bg: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)' },
  terminada: { bg: 'var(--muted)',                                         color: 'var(--muted-foreground)' },
}

const PLATFORM_STYLES: Record<AdsPlatform, { icon: React.ElementType; label: string; color: string }> = {
  meta:   { icon: BarChart2, label: 'Meta', color: '#1877F2' },
  tiktok: { icon: Music,     label: 'TikTok', color: 'var(--accent)' },
}

const TYPE_ICON: Record<AdCreative['type'], React.ElementType> = {
  imagen:   Image,
  video:    Film,
  carrusel: LayoutGrid,
}

function CreativeCard({ creative }: { creative: AdCreative }) {
  const platform = PLATFORM_STYLES[creative.platform]
  const PlatformIcon = platform.icon
  const TypeIcon = TYPE_ICON[creative.type]
  const statusStyle = STATUS_STYLES[creative.status]

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <TypeIcon size={15} style={{ color: 'var(--muted-foreground)' }} />
          </div>
          <p
            className="text-sm font-medium line-clamp-2 leading-snug"
            style={{ color: 'var(--foreground)' }}
          >
            {creative.name}
          </p>
        </div>
      </div>

      {/* Platform + status badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${platform.color}18`, color: platform.color }}
        >
          <PlatformIcon size={10} />
          {platform.label}
        </span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
        >
          {creative.status}
        </span>
        <span
          className="text-[11px] px-2 py-0.5 rounded-full capitalize"
          style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
        >
          {creative.type}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricRow label="Impresiones" value={formatK(creative.impressions)} />
        <MetricRow label="CTR" value={formatPercent(creative.ctr)} highlight />
        <MetricRow label="CPC" value={`$${creative.cpc.toFixed(2)}`} />
        <MetricRow label="Gasto" value={`$${formatK(creative.spend)}`} />
      </div>

      {/* ROAS highlight */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-lg"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>ROAS</span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{
            color: creative.roas >= 5 ? 'var(--success)' : creative.roas >= 3 ? 'var(--stat-icon)' : 'var(--accent)',
          }}
        >
          ×{creative.roas.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </p>
      <p
        className="text-sm font-semibold tabular-nums mt-0.5"
        style={{ color: highlight ? 'var(--accent)' : 'var(--foreground)' }}
      >
        {value}
      </p>
    </div>
  )
}

export function AdsCreativosTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {AD_CREATIVES.length} creativos totales ·{' '}
          {AD_CREATIVES.filter(c => c.status === 'activa').length} activos
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {AD_CREATIVES.map(c => (
          <CreativeCard key={c.id} creative={c} />
        ))}
      </div>
    </div>
  )
}
