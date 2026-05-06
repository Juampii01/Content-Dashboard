'use client'

import { Eye, Heart, MessageCircle, ExternalLink, Clock, Film } from 'lucide-react'
import type { ReelDTO } from '@/lib/types/competidores'
import { formatK } from '@/lib/utils/formatters'

interface ReelCardProps {
  reel: ReelDTO
  onOpenDrawer: (reelId: string) => void
}

export function ReelCard({ reel, onOpenDrawer }: ReelCardProps) {
  function handleCardClick() {
    onOpenDrawer(reel.id)
  }

  function handleVerEnIG(e: React.MouseEvent) {
    e.stopPropagation()
    const safeUrl = reel.url?.startsWith('https://') ? reel.url : '#'
    window.open(safeUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      onClick={handleCardClick}
      className="cursor-pointer rounded-xl overflow-hidden transition-all duration-150 hover:scale-[1.01] hover:opacity-95"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Thumbnail — 9:16 aspect ratio */}
      <div
        className="relative w-full flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: '9/16', maxHeight: '220px', backgroundColor: 'var(--muted)' }}
      >
        {reel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- IG CDN URLs rotate, would need wildcard remotePatterns
          <img
            src={reel.thumbnailUrl}
            alt={reel.caption ?? 'Reel thumbnail'}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film size={30} style={{ color: 'var(--muted-foreground)' }} />
          </div>
        )}

        {/* "Ver en Instagram" pill — top right */}
        <button
          onClick={handleVerEnIG}
          aria-label="Ver en Instagram"
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all hover:opacity-80 z-10"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', backdropFilter: 'blur(4px)' }}
        >
          <ExternalLink size={9} />
          Ver en IG
        </button>

        {/* Duration badge — bottom left */}
        {reel.durationSec != null && (
          <div
            className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }}
          >
            <Clock size={9} />
            {reel.durationSec}s
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--foreground)' }}>
            <Eye size={11} />
            {formatK(reel.viewsCount)}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={11} />
            {formatK(reel.likesCount)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={11} />
            {formatK(reel.commentsCount)}
          </span>
        </div>

        {/* Caption snippet */}
        {reel.caption && (
          <p
            className="text-[11px] leading-tight line-clamp-2 mt-1.5"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {reel.caption}
          </p>
        )}
      </div>
    </div>
  )
}
