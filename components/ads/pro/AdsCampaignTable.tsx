'use client'

import { Loader2 } from 'lucide-react'
import { useAdCampaigns, type AdCampaignRow } from '@/hooks/useAdsData'
import { META_GREEN, fmtSpend, fmtNum, fmtPct } from './ads-theme'

interface AdsCampaignTableProps {
  connected: boolean
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE'
  const paused = status === 'PAUSED'

  const dotColor = active ? META_GREEN : paused ? '#9ca3af' : '#374151'
  const label = active ? 'Activa' : paused ? 'Pausada' : 'Otra'

  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      {label}
    </span>
  )
}

function ctrColor(ctr: number): string {
  if (ctr >= 2) return '#22c55e'
  if (ctr >= 1) return '#f59e0b'
  return '#ef4444'
}

function roasColor(roas: number): string {
  if (roas >= 3) return '#22c55e'
  if (roas >= 1) return '#f59e0b'
  return '#ef4444'
}

const COL_HEADERS = [
  'Campaña',
  'Estado',
  'Objetivo',
  'Gasto',
  'Impresiones',
  'Clics',
  'CTR',
  'CPC',
  'ROAS',
  'Conv.',
]

function CampaignRow({ c, last }: { c: AdCampaignRow; last: boolean }) {
  return (
    <tr
      style={{
        backgroundColor: 'var(--card)',
        borderBottom: last ? undefined : '1px solid var(--border)',
      }}
    >
      {/* Campaign Name */}
      <td className="px-4 py-3 max-w-[200px]">
        <p
          className="font-semibold text-xs truncate"
          style={{ color: 'var(--foreground)' }}
          title={c.name}
        >
          {c.name || '(Sin nombre)'}
        </p>
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={c.status} />
      </td>

      {/* Objective */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          {c.objective || '—'}
        </span>
      </td>

      {/* Spend */}
      <td className="px-4 py-3 tabular-nums text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
        {fmtSpend(c.spend)}
      </td>

      {/* Impressions */}
      <td className="px-4 py-3 tabular-nums text-xs whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
        {fmtNum(c.impressions)}
      </td>

      {/* Clicks */}
      <td className="px-4 py-3 tabular-nums text-xs whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
        {fmtNum(c.clicks)}
      </td>

      {/* CTR */}
      <td className="px-4 py-3 tabular-nums text-xs font-semibold whitespace-nowrap" style={{ color: ctrColor(c.ctr) }}>
        {fmtPct(c.ctr)}
      </td>

      {/* CPC */}
      <td className="px-4 py-3 tabular-nums text-xs whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
        {c.cpc > 0 ? fmtSpend(c.cpc) : '—'}
      </td>

      {/* ROAS */}
      <td className="px-4 py-3 tabular-nums text-xs font-semibold whitespace-nowrap" style={{ color: roasColor(c.roas) }}>
        {c.roas > 0 ? `${c.roas.toFixed(2)}x` : '—'}
      </td>

      {/* Conversions */}
      <td className="px-4 py-3 tabular-nums text-xs whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
        {c.conversions > 0 ? fmtNum(c.conversions) : '—'}
      </td>
    </tr>
  )
}

export function AdsCampaignTable({ connected }: AdsCampaignTableProps) {
  const { campaigns, loading, loadingMore, hasMore, loadMore } = useAdCampaigns(connected)

  if (loading && campaigns.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }} className="flex gap-4 px-4 py-3">
            {[140, 60, 80, 60, 80, 50, 50, 50, 50, 50].map((w, i) => (
              <div key={i} className="h-3 rounded animate-pulse shrink-0" style={{ width: w, backgroundColor: 'var(--border)' }} />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5" style={{ borderBottom: i < 5 ? '1px solid var(--border)' : undefined, backgroundColor: 'var(--card)' }}>
              <div className="flex-1">
                <div className="h-3 rounded animate-pulse" style={{ width: `${50 + (i * 17) % 35}%`, backgroundColor: 'var(--muted)', animationDelay: `${i * 50}ms` }} />
              </div>
              {[55, 70, 55, 65, 45, 45, 45, 45, 45].map((w, j) => (
                <div key={j} className="h-3 rounded animate-pulse shrink-0" style={{ width: w, backgroundColor: 'var(--muted)', animationDelay: `${i * 50 + j * 15}ms` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Sin campañas sincronizadas.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Pulsa &quot;Sincronizar&quot; para importar las campañas de tu cuenta de Meta Ads.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {campaigns.length} campaña{campaigns.length === 1 ? '' : 's'}
      </p>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                {COL_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <CampaignRow key={c.id} c={c} last={i === campaigns.length - 1} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          >
            {loadingMore ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Cargando…
              </>
            ) : (
              'Cargar más'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
