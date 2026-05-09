'use client'

import type { Campaign, CampaignStatus } from '@/lib/mock-data/ads'
import { formatK, formatPercent } from '@/lib/utils/formatters'

const STATUS_STYLES: Record<CampaignStatus, { bg: string; color: string; label: string }> = {
  activa:    { bg: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)',  label: 'Activa' },
  pausada:   { bg: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)',  label: 'Pausada' },
  terminada: { bg: 'var(--muted)',                                         color: 'var(--muted-foreground)', label: 'Terminada' },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

interface Props {
  campaigns: Campaign[]
}

export function CampaignTable({ campaigns }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="grid text-[11px] font-semibold tracking-wider uppercase px-5 py-3"
        style={{
          gridTemplateColumns: '2fr 90px 90px 90px 90px 70px 70px 70px',
          backgroundColor: 'var(--muted)',
          color: 'var(--muted-foreground)',
        }}
      >
        <span>Campaña</span>
        <span className="text-right">Estado</span>
        <span className="text-right">Presupuesto</span>
        <span className="text-right">Gastado</span>
        <span className="text-right">Alcance</span>
        <span className="text-right">CTR</span>
        <span className="text-right">CPC</span>
        <span className="text-right">ROAS</span>
      </div>

      {/* Rows */}
      {campaigns.map((c, i) => (
        <div
          key={c.id}
          className="grid items-center px-5 py-4 text-sm"
          style={{
            gridTemplateColumns: '2fr 90px 90px 90px 90px 70px 70px 70px',
            backgroundColor: i % 2 === 0 ? 'var(--card)' : 'transparent',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div className="min-w-0 pr-4">
            <p className="truncate font-medium" style={{ color: 'var(--foreground)' }}>
              {c.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {c.startDate}{c.endDate ? ` → ${c.endDate}` : ' → en curso'}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge status={c.status} />
          </div>
          <span className="text-right tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
            ${formatK(c.budget)}
          </span>
          <span className="text-right tabular-nums font-medium" style={{ color: 'var(--foreground)' }}>
            ${formatK(c.spent)}
          </span>
          <span className="text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
            {formatK(c.reach)}
          </span>
          <span className="text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
            {formatPercent(c.ctr)}
          </span>
          <span className="text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
            ${c.cpc.toFixed(2)}
          </span>
          <span
            className="text-right tabular-nums font-bold"
            style={{ color: c.roas >= 4 ? 'var(--success)' : c.roas >= 2 ? 'var(--stat-icon)' : 'var(--accent)' }}
          >
            ×{c.roas.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  )
}
