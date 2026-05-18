'use client'

import { useState } from 'react'
import { Eye, Heart, MessageCircle, ExternalLink, Clock, Film, FileText, BarChart2 } from 'lucide-react'
import type { ReelDTO } from '@/lib/types/competidores'
import { formatK } from '@/lib/utils/formatters'

function formatDuration(sec: number): string {
  const total = Math.round(sec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

interface ReelCardProps {
  reel: ReelDTO
  onOpenDrawer: (reelId: string) => void
}

export function ReelCard({ reel, onOpenDrawer }: ReelCardProps) {
  const [imgFailed, setImgFailed] = useState(false)

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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick() }}
      className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
    >
      {/* Thumbnail — 9:16 aspect ratio */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '9/16', backgroundColor: 'var(--muted)' }}
      >
        {reel.thumbnailUrl && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- IG CDN URLs rotate
          <img
            src={reel.thumbnailUrl}
            alt=""
            aria-hidden="true"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--muted) 80%, var(--card)) 0%, var(--muted) 100%)',
            }}
          >
            <Film size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
          </div>
        )}

        {/* Dark gradient overlay at bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-3/4"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 45%, transparent 100%)',
          }}
        />

        {/* Top bar: badges left + Ver en IG right */}
        <div className="absolute top-0 inset-x-0 flex items-start justify-between p-2 gap-1">
          {/* Badges: analysis / transcription */}
          <div className="flex items-center gap-1 flex-wrap">
            {reel.hasTranscription && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', backdropFilter: 'blur(4px)' }}
              >
                <FileText size={8} />
                Trans.
              </span>
            )}
            {reel.analysesCount > 0 && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 80%, black)',
                  color: 'var(--accent-foreground)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <BarChart2 size={8} />
                {reel.analysesCount}
              </span>
            )}
          </div>

          {/* Ver en IG button */}
          <button
            onClick={handleVerEnIG}
            aria-label="Ver en Instagram"
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all hover:bg-white/20 opacity-0 group-hover:opacity-100"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            <ExternalLink size={9} />
            Ver en IG
          </button>
        </div>

        {/* Duration — bottom left */}
        {reel.durationSec != null && reel.durationSec > 0 && (
          <div
            className="absolute bottom-[72px] left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            <Clock size={8} />
            {formatDuration(reel.durationSec)}
          </div>
        )}

        {/* Bottom overlay: stats + caption */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-6">
          {/* Stats row */}
          <div className="flex items-center gap-3 mb-1.5">
            <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#fff' }}>
              <Eye size={11} style={{ opacity: 0.9 }} />
              {formatK(reel.viewsCount)}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <Heart size={10} style={{ opacity: 0.8 }} />
              {formatK(reel.likesCount)}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <MessageCircle size={10} style={{ opacity: 0.8 }} />
              {formatK(reel.commentsCount)}
            </span>
          </div>

          {/* Caption */}
          {reel.caption && (
            <p
              className="text-[11px] leading-snug line-clamp-2"
              style={{ color: 'rgba(255,255,255,0.75)' }}
            >
              {reel.caption}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
