'use client'

import { DollarSign, Eye, MousePointer, TrendingUp, ShoppingCart, Percent } from 'lucide-react'
import { useAdsAccountSummary } from '@/hooks/useAdsData'
import { formatK } from '@/lib/utils/formatters'

interface KPICardProps {
  label: string
  value: string
  hint: string
  icon: React.ReactNode
  highlight?: boolean
}

function KPICard({ label, value, hint, icon, highlight }: KPICardProps) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col justify-between"
      style={{
        backgroundColor: highlight
          ? 'color-mix(in srgb, var(--accent) 8%, var(--card))'
          : 'var(--card)',
        border: `1px solid ${highlight ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border)'}`,
      }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </p>
        <span style={{ color: highlight ? 'var(--accent)' : 'var(--muted-foreground)' }}>{icon}</span>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
          {value}
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
          {hint}
        </p>
      </div>
    </div>
  )
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  connected: boolean
  hasData: boolean
}

export function AdsDashboardTab({ connected, hasData }: Props) {
  const { data: summary, loading } = useAdsAccountSummary()
  const stats = summary?.stats ?? null

  if (!connected && !loading) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Conecta Meta Ads para ver métricas de campañas en vivo.
        </p>
      </div>
    )
  }

  if (connected && !hasData && !loading) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Aún no hay datos sincronizados.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Usa el botón &quot;Sincronizar&quot; para importar tus campañas de Meta Ads.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KPICard
          label="Gasto total"
          value={stats ? formatCurrency(stats.spend) : '—'}
          hint="Últimos 30 días · todas las campañas"
          icon={<DollarSign size={16} />}
          highlight
        />
        <KPICard
          label="Impresiones"
          value={stats ? formatK(stats.impressions) : '—'}
          hint="Suma de todas las campañas"
          icon={<Eye size={16} />}
        />
        <KPICard
          label="Clics"
          value={stats ? formatK(stats.clicks) : '—'}
          hint="Clics al enlace de las campañas"
          icon={<MousePointer size={16} />}
        />
        <KPICard
          label="ROAS promedio"
          value={stats ? `${stats.avgRoas.toFixed(2)}x` : '—'}
          hint="Retorno sobre inversión publicitaria"
          icon={<TrendingUp size={16} />}
          highlight={Boolean(stats && stats.avgRoas >= 2)}
        />
        <KPICard
          label="Conversiones"
          value={stats ? String(stats.conversions) : '—'}
          hint="Compras / eventos de conversión"
          icon={<ShoppingCart size={16} />}
        />
        <KPICard
          label="CTR promedio"
          value={stats ? `${stats.avgCtr.toFixed(2)}%` : '—'}
          hint="Click-through rate promedio"
          icon={<Percent size={16} />}
        />
      </div>

      {/* Summary card */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-3"
          style={{ color: 'var(--muted-foreground)' }}
        >
          RESUMEN
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Campañas sincronizadas</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
              {summary?.campaignsCount ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Período</p>
            <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Últimos 30d</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Cuenta</p>
            <p className="text-lg font-bold truncate" style={{ color: 'var(--foreground)' }}>
              {summary?.account?.accountName ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Última sync</p>
            <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              {formatDate(stats?.syncedAt ?? null)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
