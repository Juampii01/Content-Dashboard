'use client'

import { PlaySquare, Eye, ThumbsUp, MessageCircle, TrendingUp, TrendingDown } from 'lucide-react'
import type { YouTubeVideoRow } from '@/hooks/useYouTubeData'
import { fmtViews, fmtDuration, YT_RED } from './yt-theme'

interface YTVideoCardProps {
  video: YouTubeVideoRow
  avgViews: number
  onClick?: () => void
}

export function YTVideoCard({ video, avgViews, onClick }: YTVideoCardProps) {
  const ratio = avgViews > 0 ? video.viewsCount / avgViews : 0
  const above = avgViews > 0 && ratio >= 1.5
  const below = avgViews > 0 && ratio <= 0.6
  const pct = avgViews > 0 ? Math.round((ratio - 1) * 100) : 0

  const durationLabel = video.durationLabel || (video.durationSec > 0 ? fmtDuration(video.durationSec) : null)

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col rounded-xl overflow-hidden border border-border/50 bg-card hover:border-border transition-all hover:scale-[1.02] ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Thumbnail — 16:9 */}
      <div className="relative aspect-video bg-muted">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title || 'YouTube video'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlaySquare className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}

        {/* Duration badge — bottom right */}
        {durationLabel && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 text-white text-xs font-mono">
            {durationLabel}
          </div>
        )}

        {/* Performance badge — top right */}
        {avgViews > 0 && (above || below) && (
          <div
            className={`absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${
              above ? 'bg-black/70 text-white' : 'bg-black/50 text-white/80'
            }`}
          >
            {above ? (
              <TrendingUp className="w-3 h-3" style={{ color: '#22c55e' }} />
            ) : (
              <TrendingDown className="w-3 h-3" style={{ color: YT_RED }} />
            )}
            <span>{pct > 0 ? '+' : ''}{pct}%</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
          {video.title || 'Sin título'}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {fmtViews(video.viewsCount)}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5" />
            {fmtViews(video.likesCount)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {fmtViews(video.commentsCount)}
          </span>
        </div>
        {video.publishedAt && (
          <p className="text-xs text-muted-foreground">
            {new Date(video.publishedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
