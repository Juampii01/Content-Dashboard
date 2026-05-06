'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Users, Eye, Video, TrendingUp } from 'lucide-react'
import { formatK } from '@/lib/utils/formatters'
import { usePeriod } from '@/hooks/usePeriod'
import {
  useYouTubeChannelSummary,
  useYouTubeSnapshots,
  type YouTubeSnapshotPoint,
} from '@/hooks/useYouTubeData'

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

function formatChartDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

function sliceByPeriod(points: YouTubeSnapshotPoint[], periodDays: number): YouTubeSnapshotPoint[] {
  if (points.length === 0) return points
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - periodDays)
  const filtered = points.filter((p) => new Date(p.date) >= cutoff)
  // If filtering left us with fewer than 2 points but we have more history,
  // keep the last 2 so the chart can still draw a line.
  if (filtered.length < 2 && points.length >= 2) return points.slice(-2)
  return filtered
}

interface Props {
  connected: boolean
  hasData: boolean
}

export function YouTubeDashboardTab({ connected, hasData }: Props) {
  const [period] = usePeriod()
  const { data: summary, loading: loadingSummary } = useYouTubeChannelSummary()
  const { snapshots, loading: loadingSnapshots } = useYouTubeSnapshots(connected)

  const snapshot = summary?.snapshot ?? null
  const subscribers = snapshot?.subscribers ?? 0
  const totalViews = snapshot?.totalViews ?? 0
  const videoCount = snapshot?.videoCount ?? summary?.videosCount ?? 0

  const chartPoints = sliceByPeriod(snapshots, period)
  const canShowGrowth = chartPoints.length >= 2
  const tickInterval = period <= 7 ? 0 : period <= 14 ? 1 : period <= 30 ? 4 : 13

  // Not connected → render nothing (YouTubeContent already shows the connect banner).
  if (!connected && !loadingSummary) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Conecta tu canal de YouTube para ver métricas en vivo.
        </p>
      </div>
    )
  }

  // Connected but never synced → invite sync instead of showing zeros.
  if (connected && !hasData && !loadingSummary) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Aún no has sincronizado datos.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Usa el botón “Sincronizar” arriba para traer las métricas del canal y los últimos videos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Suscriptores"
          value={formatK(subscribers)}
          hint={snapshot ? `Último snapshot: ${formatChartDate(snapshot.date)}` : 'Sincroniza para poblar'}
          icon={<Users size={16} />}
        />
        <KPICard
          label="Vistas totales"
          value={formatK(totalViews)}
          hint="Acumulado del canal"
          icon={<Eye size={16} />}
        />
        <KPICard
          label="Videos"
          value={String(videoCount)}
          hint={`${summary?.videosCount ?? 0} sincronizados localmente`}
          icon={<Video size={16} />}
        />
        <KPICard
          label="Historial"
          value={String(snapshots.length)}
          hint="Snapshots guardados"
          icon={<TrendingUp size={16} />}
        />
      </div>

      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-1"
              style={{ color: 'var(--muted-foreground)' }}
            >
              CRECIMIENTO ÚLTIMOS {period} DÍAS
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
              {formatK(subscribers)}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              suscriptores totales
            </p>
          </div>
        </div>

        {canShowGrowth ? (
          <>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartPoints.map((p) => ({
                    date: formatChartDate(p.date),
                    subscribers: p.subscribers,
                    views: p.totalViews,
                  }))}
                  margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={tickInterval}
                  />
                  <YAxis
                    yAxisId="subs"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatK}
                  />
                  <YAxis
                    yAxisId="views"
                    orientation="right"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatK}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: 'var(--foreground)', fontSize: 12 }}
                    formatter={(v: unknown, name: unknown) => [
                      formatK(v as number),
                      name === 'subscribers' ? 'Suscriptores' : 'Vistas',
                    ]}
                  />
                  <Line
                    yAxisId="subs"
                    type="monotone"
                    dataKey="subscribers"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    dot={false}
                    name="subscribers"
                  />
                  <Line
                    yAxisId="views"
                    type="monotone"
                    dataKey="views"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    dot={false}
                    name="views"
                    strokeDasharray="4 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-6 mt-3">
              <div
                className="flex items-center gap-2 text-xs"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <span
                  className="w-4 h-0.5 inline-block"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
                Suscriptores
              </div>
              <div
                className="flex items-center gap-2 text-xs"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <span
                  className="w-4 h-0.5 inline-block"
                  style={{ backgroundColor: 'var(--muted-foreground)' }}
                />
                Vistas
              </div>
            </div>
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center rounded-lg py-10 px-4"
            style={{ backgroundColor: 'var(--muted)', minHeight: 220 }}
          >
            <TrendingUp size={20} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm font-semibold mt-3" style={{ color: 'var(--foreground)' }}>
              Próximamente — necesitamos más historial para mostrar crecimiento
            </p>
            <p className="text-xs mt-1 max-w-sm" style={{ color: 'var(--muted-foreground)' }}>
              {loadingSnapshots
                ? 'Cargando snapshots…'
                : 'Se necesita al menos 2 días de datos sincronizados. Vuelve mañana o sincroniza tras cambios en el canal.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
