'use client'

import { Users, Eye, Video, TrendingUp } from 'lucide-react'
import { formatK } from '@/lib/utils/formatters'
import { useTikTokChannelSummary } from '@/hooks/useTikTokData'

interface KPICardProps {
  label: string
  value: string
  hint: string
  icon: React.ReactNode
}

function KPICard({ label, value, hint, icon }: KPICardProps) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col justify-between"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <p
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {label}
        </p>
        <span style={{ color: 'var(--muted-foreground)' }}>{icon}</span>
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

function formatSnapshotDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  connected: boolean
  hasData: boolean
}

export function TikTokDashboardTab({ connected, hasData: _hasData }: Props) {
  const { data: summary, loading } = useTikTokChannelSummary()

  const snapshot = summary?.latestSnapshot ?? null
  const followers = snapshot?.followers ?? 0
  const totalViews = snapshot?.totalViews ?? 0
  const videoCount = snapshot?.posts ?? 0
  const engagementRate = snapshot?.engagementRate ?? 0

  if (!connected && !loading) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Conecta tu cuenta de TikTok para ver métricas en vivo.
        </p>
      </div>
    )
  }

  if (connected && !snapshot && !loading) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Aún no has sincronizado datos.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Usa el botón &quot;Sincronizar&quot; arriba para traer las métricas de la cuenta y los últimos videos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Seguidores"
          value={formatK(followers)}
          hint={snapshot ? `Último snapshot: ${formatSnapshotDate(snapshot.date)}` : 'Sincroniza para poblar'}
          icon={<Users size={16} />}
        />
        <KPICard
          label="Vistas totales"
          value={formatK(totalViews)}
          hint="Acumulado de todos los videos"
          icon={<Eye size={16} />}
        />
        <KPICard
          label="Videos"
          value={String(videoCount)}
          hint={`${summary?.videosCount ?? 0} sincronizados localmente`}
          icon={<Video size={16} />}
        />
        <KPICard
          label="Engagement"
          value={`${engagementRate.toFixed(2)}%`}
          hint="(likes + comentarios) / seguidores"
          icon={<TrendingUp size={16} />}
        />
      </div>

      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-3"
          style={{ color: 'var(--muted-foreground)' }}
        >
          RESUMEN DE CUENTA
        </p>
        {snapshot ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Seguidores</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(snapshot.followers)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Siguiendo</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(snapshot.following)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Videos publicados</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{snapshot.posts}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Última sync</p>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{formatSnapshotDate(snapshot.date)}</p>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center rounded-lg py-10 px-4"
            style={{ backgroundColor: 'var(--muted)', minHeight: 120 }}
          >
            <TrendingUp size={20} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm font-semibold mt-3" style={{ color: 'var(--foreground)' }}>
              Sin datos todavía
            </p>
            <p className="text-xs mt-1 max-w-sm" style={{ color: 'var(--muted-foreground)' }}>
              Sincroniza para poblar el dashboard con las métricas reales de la cuenta.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
