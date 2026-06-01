'use client'

import { Play, Heart, Share2 } from 'lucide-react'
import type { TikTokVideoRow } from '@/hooks/useTikTokData'
import { fmtTT, TT_TEAL, TT_PINK } from './tt-theme'

interface TTTopVideosProps {
  videos: TikTokVideoRow[]
}

const MEDALS = ['🥇', '🥈', '🥉']
const MEDAL_COLORS = [
  { border: '#FFD700', glow: 'rgba(255,215,0,0.3)' },
  { border: '#C0C0C0', glow: 'rgba(192,192,192,0.2)' },
  { border: '#CD7F32', glow: 'rgba(205,127,50,0.2)' },
]

interface VideoThumbProps {
  video: TikTokVideoRow
  rank: number
}

function VideoThumb({ video, rank }: VideoThumbProps) {
  const medal = MEDALS[rank]
  const colors = MEDAL_COLORS[rank]

  return (
    <div
      className="flex-1 flex flex-col gap-3 rounded-xl overflow-hidden border bg-card"
      style={{ borderColor: colors.border }}
    >
      {/* Vertical thumbnail */}
      <div className="relative" style={{ paddingTop: '177.78%' }}>
        <div className="absolute inset-0 bg-muted">
          {video.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.coverUrl}
              alt={video.title || 'Top video'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Medal overlay */}
        <div
          className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-base shadow-lg"
          style={{ background: colors.border, boxShadow: `0 0 12px ${colors.glow}` }}
        >
          {medal}
        </div>

        {/* Views overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/70 to-transparent flex items-end px-2 pb-1.5">
          <div className="flex items-center gap-1 text-white text-xs font-medium">
            <Play className="w-3 h-3 fill-current" />
            <span>{fmtTT(video.viewCount)}</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 pb-3 space-y-1.5">
        <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
          {video.title || 'Sin título'}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" style={{ color: TT_PINK }} />
            {fmtTT(video.likeCount)}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="w-3 h-3" style={{ color: TT_TEAL }} />
            {fmtTT(video.shareCount)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function TTTopVideos({ videos }: TTTopVideosProps) {
  const top3 = [...videos]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 3)

  if (top3.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Top videos</h3>
      <div className="flex gap-3">
        {top3.map((video, i) => (
          <VideoThumb key={video.id} video={video} rank={i} />
        ))}
        {/* Fill empty slots */}
        {top3.length < 3 &&
          Array.from({ length: 3 - top3.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1 rounded-xl bg-muted/20 border border-border/30" style={{ paddingTop: '100%' }} />
          ))}
      </div>
    </div>
  )
}
