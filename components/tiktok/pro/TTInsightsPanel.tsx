'use client'

import { Share2, Zap, Flame } from 'lucide-react'
import type { TikTokVideoRow } from '@/hooks/useTikTokData'
import { fmtTT, TT_TEAL, TT_PINK } from './tt-theme'

interface TTInsightsPanelProps {
  videos: TikTokVideoRow[]
}

interface InsightCardProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  value: string
  detail?: string
  accentColor?: string
}

function InsightCard({
  icon,
  title,
  subtitle,
  value,
  detail,
  accentColor,
}: InsightCardProps) {
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

export function TTInsightsPanel({ videos }: TTInsightsPanelProps) {
  if (videos.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin datos suficientes para insights. Sincroniza tus videos.
        </p>
      </div>
    )
  }

  const avgViews = videos.reduce((s, v) => s + v.viewCount, 0) / videos.length

  // Most shared
  const mostShared = [...videos].sort((a, b) => b.shareCount - a.shareCount)[0]

  // Best engagement: (likes + comments + shares) / views
  const bestEngagement = [...videos]
    .filter((v) => v.viewCount > 0)
    .sort((a, b) => {
      const erA = (a.likeCount + a.commentCount + a.shareCount) / a.viewCount
      const erB = (b.likeCount + b.commentCount + b.shareCount) / b.viewCount
      return erB - erA
    })[0]

  // Viral % (views > 1.5x avg)
  const viralCount = videos.filter((v) => v.viewCount > avgViews * 1.5).length
  const viralPct = Math.round((viralCount / videos.length) * 100)

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground mb-3">Insights</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InsightCard
          icon={<Share2 className="w-4 h-4" style={{ color: TT_TEAL }} />}
          title="Video más compartido"
          subtitle={mostShared?.title || 'Sin título'}
          value={fmtTT(mostShared?.shareCount ?? 0) + ' shares'}
          accentColor={TT_TEAL}
        />
        <InsightCard
          icon={<Zap className="w-4 h-4" style={{ color: '#a3e635' }} />}
          title="Mejor engagement"
          subtitle={bestEngagement?.title || mostShared?.title || 'Sin título'}
          value={
            bestEngagement && bestEngagement.viewCount > 0
              ? (
                  ((bestEngagement.likeCount +
                    bestEngagement.commentCount +
                    bestEngagement.shareCount) /
                    bestEngagement.viewCount) *
                  100
                ).toFixed(1) + '% ER'
              : '—'
          }
          accentColor="#a3e635"
        />
        <InsightCard
          icon={<Flame className="w-4 h-4" style={{ color: TT_PINK }} />}
          title="Videos virales"
          subtitle={`>${(avgViews * 1.5 / 1000).toFixed(1)}K vistas (1.5x promedio)`}
          value={`${viralCount} videos`}
          detail={`${viralPct}% de tu contenido`}
          accentColor={TT_PINK}
        />
      </div>
    </div>
  )
}
