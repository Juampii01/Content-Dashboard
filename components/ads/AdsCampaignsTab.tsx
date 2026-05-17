'use client'

import { Loader2, Target, TrendingUp, MousePointer, Eye } from 'lucide-react'
import { useAdCampaigns, type AdCampaignRow } from '@/hooks/useAdsData'
import { formatK } from '@/lib/utils/formatters'

interface Props {
  connected: boolean
  hasData: boolean
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: active
          ? 'color-mix(in srgb, var(--success) 12%, transparent)'
          : 'color-mix(in srgb, var(--muted-foreground) 12%, transparent)',
        color: active ? 'var(--success)' : 'var(--muted-foreground)',
        border: `1px solid ${active ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'var(--border)'}`,
      }}
    >
      {active ? 'Activa' : status === 'PAUSED' ? 'Pausada' : status}
    </span>
  )
}

export function AdsCampaignsTab({ connected, hasData }: Props) {
  const { campaigns, loading, loadingMore, hasMore, loadMore } = useAdCampaigns(connected)

  if (!connected) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <Target size={20} style={{ color: 'var(--muted-foreground)' }} className="mx-auto" />
        <p className="text-sm mt-3" style={{ color: 'var(--muted-foreground)' }}>
          Conecta Meta Ads para ver las campañas sincronizadas.
        </p>
      </div>
    )
  }

  if (loading && campaigns.length === 0) {
    return (
      <div
        className="rounded-xl p-8 flex items-center justify-center gap-2"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
        <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Cargando campañas…</span>
      </div>
    )
  }

  if (!hasData || campaigns.length === 0) {
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
      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {campaigns.length} campaña{campaigns.length === 1 ? '' : 's'} · últimos 30 días
      </span>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              {['Campaña', 'Estado', 'Gasto', 'Impresiones', 'Clics', 'CTR', 'ROAS', 'Conversiones'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c: AdCampaignRow, i) => (
              <tr
                key={c.id}
                style={{
                  backgroundColor: 'var(--card)',
                  borderBottom: i < campaigns.length - 1 ? '1px solid var(--border)' : undefined,
                }}
              >
                <td className="px-4 py-3 max-w-[200px]">
                  <p
                    className="font-medium truncate text-xs"
                    style={{ color: 'var(--foreground)' }}
                    title={c.name}
                  >
                    {c.name || '(Sin nombre)'}
                  </p>
                  {c.objective && (
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>
                      {c.objective}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 tabular-nums text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                  {formatCurrency(c.spend)}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 tabular-nums text-xs" style={{ color: 'var(--foreground)' }}>
                    <Eye size={11} style={{ color: 'var(--muted-foreground)' }} />
                    {formatK(c.impressions)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 tabular-nums text-xs" style={{ color: 'var(--foreground)' }}>
                    <MousePointer size={11} style={{ color: 'var(--muted-foreground)' }} />
                    {formatK(c.clicks)}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {c.ctr.toFixed(2)}%
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="flex items-center gap-1 tabular-nums text-xs font-semibold"
                    style={{ color: c.roas >= 2 ? 'var(--success)' : 'var(--foreground)' }}
                  >
                    <TrendingUp size={11} />
                    {c.roas > 0 ? `${c.roas.toFixed(2)}x` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-xs" style={{ color: 'var(--foreground)' }}>
                  {c.conversions > 0 ? c.conversions : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            {loadingMore ? <><Loader2 size={14} className="animate-spin" />Cargando…</> : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  )
}
