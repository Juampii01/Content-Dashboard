'use client'

import { Trophy, ThumbsUp, MessageCircle, PlaySquare, Eye } from 'lucide-react'
import type { YouTubeVideoRow } from '@/hooks/useYouTubeData'
import { fmtViews } from './yt-theme'

interface YTTopVideosProps {
  videos: YouTubeVideoRow[]
}

const MEDALS = ['🥇', '🥈', '🥉']
const MEDAL_COLORS = [
  { border: '#FFD700', glow: 'rgba(255,215,0,0.3)' },
  { border: '#C0C0C0', glow: 'rgba(192,192,192,0.2)' },
  { border: '#CD7F32', glow: 'rgba(205,127,50,0.2)' },
]

interface VideoRowProps {
  video: YouTubeVideoRow
  rank: number
}

function VideoRow({ video, rank }: VideoRowProps) {
  const medal = MEDALS[rank]
  const colors = MEDAL_COLORS[rank]

  return (
    <div
      className="flex flex-col gap-2 rounded-xl overflow-hidden border bg-card"
      style={{ borderColor: colors.border }}
    >
      {/* 16:9 thumbnail */}
      <div className="relative aspect-video bg-muted">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title || 'Top video'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlaySquare className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}

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
            <Eye className="w-3 h-3" />
            <span>{fmtViews(video.viewsCount)}</span>
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
            <ThumbsUp className="w-3 h-3" />
            {fmtViews(video.likesCount)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {fmtViews(video.commentsCount)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function YTTopVideos({ videos }: YTTopVideosProps) {
  const top3 = [...videos].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 3)

  if (top3.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Trophy className="w-4 h-4" style={{ color: '#FFD700' }} />
        Top videos
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {top3.map((video, i) => (
          <VideoRow key={video.id} video={video} rank={i} />
        ))}
      </div>
    </div>
  )
}
