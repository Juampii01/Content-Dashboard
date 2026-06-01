'use client'

import { RefreshCw, Loader2, Unlink, Megaphone } from 'lucide-react'
import { type AdsAccountSummary } from '@/hooks/useAdsData'
import { META_BLUE, fmtSpend, fmtNum, fmtPct } from './ads-theme'

interface AdsAccountHeaderProps {
  summary: AdsAccountSummary
  syncing: boolean
  onSync: () => void
  onDisconnect: () => void
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Hace un momento'
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `Hace ${days}d`
}

interface StatPillProps {
  label: string
  value: string
  accent?: boolean
}

function StatPill({ label, value, accent }: StatPillProps) {
  return (
    <div className="flex flex-col">
      <span
        className="text-lg font-bold tabular-nums"
        style={{ color: accent ? META_BLUE : 'var(--foreground)' }}
      >
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </span>
    </div>
  )
}

export function AdsAccountHeader({ summary, syncing, onSync, onDisconnect }: AdsAccountHeaderProps) {
  const { account, stats } = summary

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Top row: icon + name + actions */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: META_BLUE }}
          >
            <Megaphone size={18} color="#fff" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {account?.accountName ?? 'Meta Ads'}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Última sincronización: {formatRelativeTime(stats?.syncedAt ?? null)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
          >
            <Unlink size={12} />
            Desconectar
          </button>
        </div>
      </div>

      {/* Stats rows */}
      {stats ? (
        <>
          {/* Primary KPIs */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 mb-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <StatPill label="Gasto total" value={fmtSpend(stats.spend)} accent />
            <StatPill label="Impresiones" value={fmtNum(stats.impressions)} />
            <StatPill label="Clics" value={fmtNum(stats.clicks)} />
            <StatPill label="CTR promedio" value={fmtPct(stats.avgCtr)} />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <StatPill
              label="ROAS"
              value={stats.avgRoas > 0 ? `${stats.avgRoas.toFixed(1)}x` : '—'}
              accent={stats.avgRoas >= 3}
            />
            <StatPill
              label="CPC"
              value={stats.clicks > 0 ? fmtSpend(stats.spend / stats.clicks) : '—'}
            />
            <StatPill
              label="Conversiones"
              value={fmtNum(stats.conversions)}
            />
          </div>
        </>
      ) : (
        <div className="py-2">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Sin datos — pulsa &quot;Sincronizar&quot; para importar campañas.
          </p>
        </div>
      )}
    </div>
  )
}
