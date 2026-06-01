'use client'

import { Flame, Target, Lightbulb } from 'lucide-react'
import type { YouTubeVideoRow } from '@/hooks/useYouTubeData'
import { fmtViews, YT_RED } from './yt-theme'

interface YTInsightsPanelProps {
  videos: YouTubeVideoRow[]
}

interface InsightCardProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  value: string
  detail?: string
  accentColor?: string
}

function InsightCard({ icon, title, subtitle, value, detail, accentColor }: InsightCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 flex gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: accentColor ? `${accentColor}18` : undefined }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        {subtitle && (
          <p className="text-sm font-medium text-foreground truncate mt-0.5">{subtitle}</p>
        )}
        <p className="text-xl font-bold text-foreground leading-none mt-1">{value}</p>
        {detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}
      </div>
    </div>
  )
}

export function YTInsightsPanel({ videos }: YTInsightsPanelProps) {
  if (videos.length < 3) return null

  const avgViews = videos.reduce((s, v) => s + v.viewsCount, 0) / videos.length

  // Best video by views
  const bestVideo = [...videos].sort((a, b) => b.viewsCount - a.viewsCount)[0]
  const bestOverAvg =
    avgViews > 0 ? Math.round((bestVideo.viewsCount / avgViews - 1) * 100) : 0

  // Best engagement: (likes + comments) / views
  const bestEngagement = [...videos]
    .filter((v) => v.viewsCount > 0)
    .sort((a, b) => {
      const erA = (a.likesCount + a.commentsCount) / a.viewsCount
      const erB = (b.likesCount + b.commentsCount) / b.viewsCount
      return erB - erA
    })[0]
  const bestEr =
    bestEngagement && bestEngagement.viewsCount > 0
      ? ((bestEngagement.likesCount + bestEngagement.commentsCount) / bestEngagement.viewsCount) * 100
      : 0

  // % of videos above average
  const aboveCount = videos.filter((v) => v.viewsCount > avgViews).length
  const abovePct = Math.round((aboveCount / videos.length) * 100)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Insights</h3>
      <div className="grid grid-cols-1 gap-3">
        <InsightCard
          icon={<Flame className="w-4 h-4" style={{ color: YT_RED }} />}
          title="Mejor video"
          subtitle={bestVideo.title || 'Sin título'}
          value={fmtViews(bestVideo.viewsCount) + ' vistas'}
          detail={bestOverAvg > 0 ? `+${bestOverAvg}% sobre el promedio` : undefined}
          accentColor={YT_RED}
        />
        <InsightCard
          icon={<Target className="w-4 h-4" style={{ color: '#22c55e' }} />}
          title="Mayor engagement"
          subtitle={bestEngagement?.title || 'Sin título'}
          value={bestEr > 0 ? bestEr.toFixed(1) + '% ER' : '—'}
          detail="(likes + comentarios) / vistas"
          accentColor="#22c55e"
        />
        <InsightCard
          icon={<Lightbulb className="w-4 h-4" style={{ color: '#f59e0b' }} />}
          title="Sobre el promedio"
          value={`${abovePct}%`}
          detail={`${aboveCount} de ${videos.length} videos superan el promedio`}
          accentColor="#f59e0b"
        />
      </div>
    </div>
  )
}
