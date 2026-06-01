'use client'

import { Play, Heart, MessageCircle, Share2, TrendingUp, TrendingDown } from 'lucide-react'
import type { TikTokVideoRow } from '@/hooks/useTikTokData'
import { fmtTT, TT_TEAL, TT_PINK } from './tt-theme'

interface TTVideoCardProps {
  video: TikTokVideoRow
  avgViews: number
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function TTVideoCard({ video, avgViews }: TTVideoCardProps) {
  const aboveAvg = avgViews > 0 && video.viewCount > avgViews * 1.2

  return (
    <div className="group relative flex flex-col rounded-xl overflow-hidden border border-border/50 bg-card hover:border-border transition-colors">
      {/* Thumbnail — 9:16 aspect ratio */}
      <div className="relative" style={{ paddingTop: '177.78%' /* 16/9 * 100 */ }}>
        <div className="absolute inset-0 bg-muted">
          {video.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.coverUrl}
              alt={video.title || 'TikTok video'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Duration badge — top right */}
        {video.durationSec > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-xs font-mono">
            {formatDuration(video.durationSec)}
          </div>
        )}

        {/* Performance badge — top left */}
        {avgViews > 0 && (
          <div
            className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${
              aboveAvg ? 'bg-black/70 text-white' : 'bg-black/50 text-white/70'
            }`}
          >
            {aboveAvg ? (
              <TrendingUp className="w-3 h-3" style={{ color: TT_TEAL }} />
            ) : (
              <TrendingDown className="w-3 h-3" style={{ color: TT_PINK }} />
            )}
            <span>{aboveAvg ? '+' : ''}{avgViews > 0 ? Math.round((video.viewCount / avgViews - 1) * 100) : 0}%</span>
          </div>
        )}

        {/* Views overlay — bottom left (always visible) */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent flex items-end px-2 pb-1.5">
          <div className="flex items-center gap-1 text-white text-xs font-medium">
            <Play className="w-3 h-3 fill-current" />
            <span>{fmtTT(video.viewCount)}</span>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 text-white">
            <div className="flex items-center gap-1.5 text-xs">
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="font-medium">{fmtTT(video.viewCount)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Heart className="w-3.5 h-3.5 fill-current" style={{ color: TT_PINK }} />
              <span className="font-medium">{fmtTT(video.likeCount)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span className="font-medium">{fmtTT(video.commentCount)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Share2 className="w-3.5 h-3.5" style={{ color: TT_TEAL }} />
              <span className="font-medium">{fmtTT(video.shareCount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="p-2">
        <p className="text-xs text-foreground line-clamp-2 leading-snug">
          {video.title || 'Sin título'}
        </p>
        {video.publishedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(video.publishedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
