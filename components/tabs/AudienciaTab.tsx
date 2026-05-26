'use client'

import {
  Users,
  Heart,
  MessageCircle,
  Eye,
  TrendingUp,
  Trophy,
  ExternalLink,
  Globe,
  MapPin,
  AlertCircle,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useAudienceStats } from '@/hooks/useAudienceStats'
import { useAudienceDemographics } from '@/hooks/useAudienceDemographics'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { formatK } from '@/lib/utils/formatters'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ backgroundColor: 'var(--muted)' }}
    />
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <Skeleton className="h-3 w-24 mb-4" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: accent ? 'var(--accent)' : 'var(--card)',
        border: accent ? 'none' : '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: accent ? 'var(--accent-foreground)' : 'var(--muted-foreground)', opacity: accent ? 0.8 : 1 }}
        >
          {label}
        </p>
        <Icon size={16} style={{ color: accent ? 'var(--accent-foreground)' : 'var(--stat-icon)', opacity: accent ? 0.8 : 1 }} />
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ color: accent ? 'var(--accent-foreground)' : 'var(--foreground)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: accent ? 'var(--accent-foreground)' : 'var(--muted-foreground)', opacity: accent ? 0.7 : 1 }}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--muted)' }}>
        <Users size={20} style={{ color: 'var(--muted-foreground)' }} />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Sin datos de audiencia</p>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Conectá tu cuenta de Instagram y sincronizá para ver métricas reales de tu audiencia.
        </p>
      </div>
    </div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="font-semibold mb-0.5" style={{ color: 'var(--foreground)' }}>{label}</p>
      <p style={{ color: 'var(--accent)' }}>{formatK(payload[0].value)}</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

// ─── Demographics section ─────────────────────────────────────────────────────

function DemographicsSection() {
  const demo = useAudienceDemographics()

  if (demo.status === 'loading') {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <Skeleton className="h-3 w-28 mb-4" />
            <div className="space-y-2">{[0,1,2,3,4].map(j => <Skeleton key={j} className="h-6 w-full" />)}</div>
          </div>
        ))}
      </div>
    )
  }

  if (demo.status === 'insufficient_followers') {
    return (
      <div className="rounded-xl p-5 flex items-start gap-3" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <AlertCircle size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Demografía no disponible</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Instagram requiere mínimo 100 seguidores para mostrar datos demográficos de audiencia.
          </p>
        </div>
      </div>
    )
  }

  if (demo.status === 'error') {
    return (
      <div className="rounded-xl p-5 flex items-start gap-3" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <AlertCircle size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0, marginTop: 2 }} />
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          No se pudieron cargar los datos demográficos. Intentá de nuevo más tarde.
        </p>
      </div>
    )
  }

  if (demo.status !== 'ok') return null

  const { genderAge, country, city, followerHistory } = demo.data
  const hasDemo = genderAge.length > 0 || country.length > 0 || city.length > 0
  if (!hasDemo) return null

  // Gender breakdown
  const femaleTotal = genderAge.filter(d => d.gender === 'F').reduce((s, d) => s + d.value, 0)
  const maleTotal   = genderAge.filter(d => d.gender === 'M').reduce((s, d) => s + d.value, 0)
  const totalGender = femaleTotal + maleTotal
  const fPct = totalGender > 0 ? Math.round((femaleTotal / totalGender) * 100) : 0
  const mPct = 100 - fPct

  // Top age ranges (merge M+F)
  const byAge: Record<string, number> = {}
  for (const d of genderAge) {
    byAge[d.ageRange] = (byAge[d.ageRange] ?? 0) + d.value
  }
  const ageData = Object.entries(byAge)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([range, value]) => ({ range, value }))
  const maxAge = Math.max(...ageData.map(d => d.value), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
          DEMOGRAFÍA DE AUDIENCIA
        </p>
        {demo.data.cached && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            Cache del día
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* Gender + Age */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={13} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              GÉNERO Y EDAD
            </p>
          </div>
          {/* Gender bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>
              <span>Mujer {fPct}%</span>
              <span>Hombre {mPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{ width: `${fPct}%`, backgroundColor: 'var(--accent)' }} />
            </div>
          </div>
          {/* Age bars */}
          <div className="space-y-2">
            {ageData.map(({ range, value }) => (
              <div key={range}>
                <div className="flex justify-between text-xs mb-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  <span>{range}</span>
                  <span>{value.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((value / maxAge) * 100)}%`, backgroundColor: 'var(--accent)', opacity: 0.7 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top countries */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Globe size={13} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              TOP PAÍSES
            </p>
          </div>
          {country.length === 0
            ? <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Sin datos</p>
            : (
              <div className="space-y-3">
                {country.map((c) => (
                  <div key={c.code}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span style={{ color: 'var(--foreground)' }}>{c.code}</span>
                      <span style={{ color: 'var(--muted-foreground)' }}>{c.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${c.pct}%`, backgroundColor: 'var(--accent)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Top cities */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={13} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              TOP CIUDADES
            </p>
          </div>
          {city.length === 0
            ? <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Sin datos</p>
            : (
              <div className="space-y-3">
                {city.map((c) => (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="truncate mr-2" style={{ color: 'var(--foreground)' }}>{c.name}</span>
                      <span className="flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>{c.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${c.pct}%`, backgroundColor: 'var(--accent)', opacity: 0.75 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* Follower history from insights */}
      {followerHistory.length > 1 && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
            NUEVOS SEGUIDORES (últimos 30 días)
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={followerHistory} margin={{ top: 0, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}` }}
                tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg px-2.5 py-1.5 text-xs shadow" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                      <p style={{ color: 'var(--muted-foreground)' }}>{label}</p>
                      <p style={{ color: 'var(--accent)' }}>+{payload[0].value} seguidores</p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="value" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AudienciaTab() {
  const { hasLoaded, summary } = useInstagramDataContext()
  const { data, loading } = useAudienceStats()

  // Still loading
  if (!hasLoaded || loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <Skeleton className="h-3 w-32 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  // No data at all
  if (!data || data.reelStats.reelCount === 0) return <EmptyState />

  const { snapshots, reelStats, topReels } = data
  const latestSnap = snapshots[snapshots.length - 1]
  const prevSnap = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null

  const followersDelta = prevSnap ? latestSnap.followers - prevSnap.followers : null
  const engRate = latestSnap?.engagementRate ?? 0

  // Best weekday to post
  const bestDay = [...reelStats.byWeekday].sort((a, b) => b.avgEngagement - a.avgEngagement)[0]

  return (
    <div className="space-y-5">

      {/* ── Demographics from Instagram Insights API ──────────────────────── */}
      <DemographicsSection />

      {/* ── Row 1: Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Seguidores"
          value={formatK(latestSnap?.followers ?? summary?.latestSnapshot?.followers ?? 0)}
          sub={followersDelta !== null
            ? `${followersDelta >= 0 ? '+' : ''}${followersDelta} vs ayer`
            : summary?.accountName ? `@${summary.accountName}` : undefined}
          icon={Users}
          accent
        />
        <StatCard
          label="Engagement rate"
          value={`${engRate.toFixed(1)}%`}
          sub={`Promedio ${reelStats.reelCount} reels`}
          icon={TrendingUp}
        />
        <StatCard
          label="Total views"
          value={formatK(reelStats.totalViews)}
          sub={`~${formatK(reelStats.totalViews > 0 && reelStats.reelCount > 0 ? Math.round(reelStats.totalViews / reelStats.reelCount) : 0)} por reel`}
          icon={Eye}
        />
      </div>

      {/* ── Row 2: Follower growth + interaction split ──────────────────────── */}
      <div className="grid grid-cols-5 gap-4">

        {/* Follower growth chart */}
        <div className="col-span-3 rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
            EVOLUCIÓN DE SEGUIDORES
          </p>
          {snapshots.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={snapshots} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getDate()}/${d.getMonth() + 1}`
                  }}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatK(v)}
                  width={36}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="followers"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--accent)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Hacé sync diario para ver la evolución.
              </p>
            </div>
          )}
        </div>

        {/* Likes vs Comments donut */}
        <div className="col-span-2 rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
            INTERACCIONES
          </p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Likes', value: reelStats.totalLikes },
                    { name: 'Comentarios', value: reelStats.totalComments },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={54}
                  dataKey="value"
                  strokeWidth={0}
                >
                  <Cell fill="var(--accent)" />
                  <Cell fill="var(--border)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Heart size={12} style={{ color: 'var(--accent)' }} />
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Me gusta</span>
                </div>
                <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(reelStats.totalLikes)}</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>~{formatK(reelStats.avgLikes)} / reel</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MessageCircle size={12} style={{ color: 'var(--muted-foreground)' }} />
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Comentarios</span>
                </div>
                <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(reelStats.totalComments)}</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>~{formatK(reelStats.avgComments)} / reel</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Best day to post + top reels ────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">

        {/* Best day bar chart */}
        <div className="col-span-2 rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              MEJOR DÍA PARA PUBLICAR
            </p>
            {bestDay && bestDay.count > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                {bestDay.label}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={reelStats.byWeekday} margin={{ top: 0, right: 4, bottom: 0, left: -16 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg px-2.5 py-1.5 text-xs shadow" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                      <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{label}</p>
                      <p style={{ color: 'var(--accent)' }}>~{payload[0].value} interacciones</p>
                    </div>
                  ) : null
                }
              />
              <Bar
                dataKey="avgEngagement"
                radius={[4, 4, 0, 0]}
                fill="var(--accent)"
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Promedio de interacciones por reel publicado ese día
          </p>
        </div>

        {/* Top reels */}
        <div className="col-span-3 rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={14} style={{ color: 'var(--accent)' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              TOP REELS POR ENGAGEMENT
            </p>
          </div>
          <div className="space-y-3">
            {topReels.map((reel, i) => (
              <div
                key={reel.id}
                className="flex items-center gap-3 rounded-lg p-2.5"
                style={{ backgroundColor: 'var(--muted)' }}
              >
                {/* Rank */}
                <span
                  className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: i === 0 ? 'var(--accent)' : 'var(--border)',
                    color: i === 0 ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                  }}
                >
                  {i + 1}
                </span>

                {/* Caption */}
                <p className="text-xs flex-1 min-w-0 line-clamp-2" style={{ color: 'var(--foreground)' }}>
                  {reel.caption || '(sin descripción)'}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-3 flex-shrink-0 text-xs tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                  <span className="flex items-center gap-1">
                    <Heart size={10} style={{ color: 'var(--accent)' }} />
                    {formatK(reel.likesCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={10} />
                    {formatK(reel.commentsCount)}
                  </span>
                  <a
                    href={reel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1"
                    style={{ color: 'var(--accent)' }}
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
