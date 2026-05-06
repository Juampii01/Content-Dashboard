'use client'

import { Eye, Heart, MessageCircle, Share2, ExternalLink, Clock, Film } from 'lucide-react'
import { formatK } from '@/lib/utils/formatters'
import type { ReelDTO } from '@/lib/types/competidores'

interface ReelTabProps {
  reel: ReelDTO
}

function MetricItem({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  value: number
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon size={14} className="opacity-60" />
      <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
        {formatK(value)}
      </span>
      <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </span>
    </div>
  )
}

/**
 * Tab 1 — Reel info: thumbnail, caption, metrics row, date, duration, IG link.
 * No inline video preview per spec.
 */
export function ReelTab({ reel }: ReelTabProps) {
  const postedAtFormatted = reel.postedAt
    ? new Date(reel.postedAt).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Thumbnail */}
      <div
        className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-xl"
        style={{
          aspectRatio: '9/16',
          border: '1px solid var(--border)',
        }}
      >
        {reel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- IG CDN URLs rotate, would need wildcard remotePatterns
          <img
            src={reel.thumbnailUrl}
            alt={`Thumbnail del reel ${reel.shortcode}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <Film size={36} style={{ color: 'var(--muted-foreground)' }} />
          </div>
        )}

        {/* Duration badge */}
        {reel.durationSec != null && (
          <div
            className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: 'rgba(0,0,0,0.65)',
              color: '#fff',
            }}
          >
            <Clock size={10} />
            {reel.durationSec}s
          </div>
        )}
      </div>

      {/* Caption */}
      {reel.caption && (
        <div
          className="rounded-xl p-3 text-sm leading-relaxed"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {reel.caption}
        </div>
      )}

      {/* Metrics row */}
      <div
        className="grid grid-cols-4 gap-2 rounded-xl p-3"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
        }}
      >
        <MetricItem icon={Eye} value={reel.viewsCount} label="Vistas" />
        <MetricItem icon={Heart} value={reel.likesCount} label="Likes" />
        <MetricItem icon={MessageCircle} value={reel.commentsCount} label="Comentarios" />
        <MetricItem icon={Share2} value={reel.sharesCount} label="Shares" />
      </div>

      {/* Footer row: date + IG link */}
      <div className="flex items-center justify-between">
        {postedAtFormatted && (
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Publicado: {postedAtFormatted}
          </span>
        )}

        <a
          href={reel.url?.startsWith('https://') ? reel.url : '#'}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
            color: 'var(--accent)',
            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          }}
        >
          <ExternalLink size={12} />
          Ver en Instagram
        </a>
      </div>
    </div>
  )
}
