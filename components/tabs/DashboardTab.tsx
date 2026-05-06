'use client'

import { usePeriod } from '@/hooks/usePeriod'
import { getDashboardStats } from '@/lib/mock-data/dashboard'
import { REELS } from '@/lib/mock-data/reels'
import { VisitasChart } from '@/components/dashboard/VisitasChart'
import { StatCard } from '@/components/dashboard/StatCard'
import { DesgloseTrafico } from '@/components/dashboard/DesgloseTrafico'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { TrendingUp, Users, Heart, MessageCircle, Trophy, Clapperboard } from 'lucide-react'
import Link from 'next/link'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { userReelToView } from '@/lib/instagram/to-reel-view'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'

export function DashboardTab() {
  const [period] = usePeriod()
  const s = getDashboardStats(period)
  const { hasRealData, reels: realReels, summary } = useInstagramDataContext()

  const reelSource = hasRealData ? realReels.map(userReelToView) : REELS
  const bestReel = [...reelSource].sort((a, b) => b.views - a.views)[0] ?? REELS[0]
  const totalLikes = hasRealData ? reelSource.reduce((sum, r) => sum + r.likes, 0) : s.likes
  const totalComments = hasRealData ? reelSource.reduce((sum, r) => sum + r.comments, 0) : s.comments
  const followersReal = summary?.latestSnapshot?.followers ?? null

  return (
    <div className="space-y-5">
      {!hasRealData && (
        <div className="flex items-center justify-end">
          <DemoDataPill />
        </div>
      )}
      {/* Row 1: Main chart + 2 stat cards */}
      <div className="grid grid-cols-3 gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="col-span-2" style={{ minHeight: 280 }}>
          <VisitasChart
            data={s.chartData}
            impressions={s.impressions}
            avgDailyReach={s.avgDailyReach}
            change={s.impressionsChange}
          />
        </div>
        <div className="flex flex-col gap-4">
          <StatCard
            label="CONVERSIÓN DE PERFIL"
            value={formatPercent(s.profileConversionRate)}
            sub={`${formatK(s.profileVisits)} visitas → ${formatK(s.newFollowers)} seguidores`}
            trend={`+${s.conversionChange}% vs período anterior`}
            trendUp
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label={followersReal !== null ? 'SEGUIDORES' : 'CRECIMIENTO DE PERFIL'}
            value={followersReal !== null ? formatK(followersReal) : formatK(s.profileGrowth)}
            sub={followersReal !== null ? 'Datos sincronizados de Instagram' : `+${formatK(s.growthLast30)} últimos ${period} días`}
            icon={<Users size={16} />}
          />
        </div>
      </div>

      {/* Row 2: Desglose + Interacciones + Mejor Reel */}
      <div className="grid grid-cols-3 gap-4">
        <DesgloseTrafico
          organic={s.trafficOrganic}
          paid={s.trafficPaid}
        />

        {/* Interacciones clave */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>INTERACCIONES CLAVE</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                <Heart className="h-3 w-3" /> ME GUSTA
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(totalLikes)}</p>
            </div>
            <div>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                <MessageCircle className="h-3 w-3" /> COMENTARIOS
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(totalComments)}</p>
            </div>
          </div>
        </div>

        {/* Mejor Reel */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>MEJOR REEL</p>
            <Trophy className="h-5 w-5" style={{ color: '#B08A4A' }} />
          </div>
          <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>1° de {reelSource.length} reels</p>
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
        </div>
      </div>
    </div>
  )
}
