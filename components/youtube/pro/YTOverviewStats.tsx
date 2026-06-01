'use client'

import { Users, Eye, PlaySquare, BarChart3, TrendingUp } from 'lucide-react'
import type { YouTubeChannelSummary, YouTubeVideoRow } from '@/hooks/useYouTubeData'
import { fmtSubs, fmtViews, YT_RED } from './yt-theme'

interface YTOverviewStatsProps {
  summary: YouTubeChannelSummary
  videos: YouTubeVideoRow[]
}

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}

function KpiCard({ icon, label, value, highlight = false }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl p-4 border flex flex-col gap-3 ${
        highlight ? 'border-transparent' : 'border-border/50 bg-card'
      }`}
      style={
        highlight
          ? {
              background: `linear-gradient(135deg, ${YT_RED}15, transparent)`,
              borderColor: `${YT_RED}40`,
            }
          : undefined
      }
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          highlight ? '' : 'bg-muted'
        }`}
        style={highlight ? { background: `${YT_RED}20` } : undefined}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  )
}

export function YTOverviewStats({ summary, videos }: YTOverviewStatsProps) {
  const snap = summary.snapshot
  const subscribers = snap?.subscribers ?? 0
  const totalViews = snap?.totalViews ?? 0
  const videoCount = snap?.videoCount ?? summary.videosCount ?? 0
  const avgPerVideo = videoCount > 0 ? Math.round(totalViews / videoCount) : 0

  // Growth: compare avg views of recent synced videos vs channel avg
  const syncedAvg =
    videos.length > 0
      ? Math.round(videos.reduce((s, v) => s + v.viewsCount, 0) / videos.length)
      : 0
  const growth =
    avgPerVideo > 0 && syncedAvg > 0
      ? Math.round((syncedAvg / avgPerVideo - 1) * 100)
      : null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <KpiCard
        icon={<Users className="w-4 h-4" style={{ color: YT_RED }} />}
        label="Suscriptores"
        value={fmtSubs(subscribers)}
        highlight
      />
      <KpiCard
        icon={<Eye className="w-4 h-4 text-muted-foreground" />}
        label="Vistas totales"
        value={fmtViews(totalViews)}
      />
      <KpiCard
        icon={<PlaySquare className="w-4 h-4 text-muted-foreground" />}
        label="Videos"
        value={fmtViews(videoCount)}
      />
      <KpiCard
        icon={<BarChart3 className="w-4 h-4 text-muted-foreground" />}
        label="Promedio/video"
        value={avgPerVideo > 0 ? fmtViews(avgPerVideo) : '—'}
      />
      <KpiCard
        icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
        label="Crecimiento"
        value={growth !== null ? `${growth > 0 ? '+' : ''}${growth}%` : '—'}
      />
    </div>
  )
}
