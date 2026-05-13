'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '@/hooks/usePeriod'
import { VisitasChart } from '@/components/dashboard/VisitasChart'
import { StatCard } from '@/components/dashboard/StatCard'
import { DesgloseTrafico } from '@/components/dashboard/DesgloseTrafico'
import { Skeleton } from '@/components/ui/skeleton'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { TrendingUp, Users, Heart, MessageCircle, Trophy, Clapperboard } from 'lucide-react'
import Link from 'next/link'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { userReelToView } from '@/lib/instagram/to-reel-view'
import type { DashboardStats, Period } from '@/lib/types'

const EMPTY: DashboardStats = {
  impressions: 0, avgDailyReach: 0, impressionsChange: 0,
  profileConversionRate: 0, profileVisits: 0, newFollowers: 0,
  conversionChange: 0, profileGrowth: 0, growthLast30: 0,
  trafficOrganic: 100, trafficPaid: 0,
  likes: 0, saves: 0, comments: 0,
  engagementRate: 0, bestReelViews: 0,
  chartData: [], interactionsData: [],
  viewsGoalPct: 0, followersGoalPct: 0,
}

export function DashboardTab() {
  const [period] = usePeriod()
  const [stats, setStats] = useState<DashboardStats>(EMPTY)
  const [statsLoaded, setStatsLoaded] = useState(false)
  const { reels: realReels, summary } = useInstagramDataContext()

  const fetchStats = useCallback((p: Period) => {
    fetch(`/api/me/dashboard-stats?period=${p}`)
      .then((r) => r.ok ? r.json() as Promise<DashboardStats> : null)
      .then((data) => { if (data) setStats(data) })
      .catch(() => {})
      .finally(() => setStatsLoaded(true))
  }, [])

  useEffect(() => { fetchStats(period) }, [period, fetchStats])

  const reelViews = realReels.map(userReelToView)
  const bestReel  = reelViews.length > 0 ? [...reelViews].sort((a, b) => b.views - a.views)[0] : null
  const followersReal = summary?.latestSnapshot?.followers ?? null

  const hasAnyData = statsLoaded && (stats.impressions > 0 || stats.likes > 0 || stats.bestReelViews > 0)

  if (!statsLoaded) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <Skeleton className="rounded-xl" style={{ height: 280 }} />
          <div className="flex flex-col gap-4">
            <Skeleton className="rounded-xl" style={{ height: 130 }} />
            <Skeleton className="rounded-xl" style={{ height: 130 }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="rounded-xl" style={{ height: 120 }} />)}
        </div>
      </div>
    )
  }

  if (!hasAnyData) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Sin datos para este período</p>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Sincronizá tus reels desde el botón &quot;Re-sincronizar&quot; para ver métricas reales aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Row 1: Main chart + 2 stat cards */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div style={{ minHeight: 280 }}>
          <VisitasChart
            data={stats.chartData}
            impressions={stats.impressions}
            avgDailyReach={stats.avgDailyReach}
            change={stats.impressionsChange}
          />
        </div>
        <div className="flex flex-col gap-4">
          {stats.profileConversionRate > 0 ? (
            <StatCard
              label="CONVERSIÓN DE PERFIL"
              value={formatPercent(stats.profileConversionRate)}
              sub={`${formatK(stats.profileVisits)} visitas → ${formatK(stats.newFollowers)} seguidores`}
              trend={stats.conversionChange ? `+${stats.conversionChange}% vs período anterior` : undefined}
              trendUp
              icon={<TrendingUp size={16} />}
            />
          ) : (
            <StatCard
              label="ENGAGEMENT RATE"
              value={`${stats.engagementRate.toFixed(1)}%`}
              sub="Promedio del período"
              icon={<TrendingUp size={16} />}
            />
          )}
          <StatCard
            label={followersReal !== null ? 'SEGUIDORES' : 'VISTAS TOTALES'}
            value={followersReal !== null ? formatK(followersReal) : formatK(stats.impressions)}
            sub={followersReal !== null ? 'Datos sincronizados' : `Período de ${period} días`}
            icon={<Users size={16} />}
          />
        </div>
      </div>

      {/* Row 2: Desglose + Interacciones + Mejor Reel */}
      <div className="grid grid-cols-3 gap-4">
        <DesgloseTrafico
          organic={stats.trafficOrganic}
          paid={stats.trafficPaid}
        />

        {/* Interacciones clave */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>INTERACCIONES CLAVE</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                <Heart className="h-3 w-3" /> ME GUSTA
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(stats.likes)}</p>
            </div>
            <div>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                <MessageCircle className="h-3 w-3" /> COMENTARIOS
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(stats.comments)}</p>
            </div>
          </div>
        </div>

        {/* Mejor Reel */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>MEJOR REEL</p>
            <Trophy className="h-5 w-5" style={{ color: 'var(--stat-icon)' }} />
          </div>
          {bestReel ? (
            <>
              <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>1° de {reelViews.length} reels</p>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', minWidth: 56 }}>
                  <Clapperboard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(bestReel.views)}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>views totales</p>
                  <Link href={`/instagram/reels/${bestReel.id}`}
                    className="text-xs mt-1 inline-block hover:underline" style={{ color: 'var(--accent)' }}>
                    Ver reel →
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>–</p>
          )}
        </div>
      </div>
    </div>
  )
}
