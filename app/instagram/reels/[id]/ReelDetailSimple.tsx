'use client'

import Link from 'next/link'
import { ArrowLeft, ExternalLink, Clock, Eye, Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react'
import { formatK } from '@/lib/utils/formatters'

interface ReelDetailViewData {
  id: string
  instagramId: string
  shortcode: string
  url: string
  thumbnailUrl: string | null
  videoUrl: string | null
  caption: string | null
  durationSec: number | null
  viewsCount: number
  likesCount: number
  commentsCount: number
  savesCount: number
  sharesCount: number
  reachCount: number
  impressions: number
  publishedAt: string | null
  syncedAt: string
}

function formatDuration(totalSeconds: number | null): string {
  if (!totalSeconds || totalSeconds <= 0) return '—'
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Minimal honest reel detail — real fields only from the UserReel table.
 * No engagement benchmarks, no per-day series, no "vs average" deltas until
 * Apify-based analytics are wired and stored.
 */
export function ReelDetailSimple({ reel }: { reel: ReelDetailViewData }) {
  const stats = [
    { Icon: Eye, label: 'Views', value: formatK(reel.viewsCount) },
    { Icon: Heart, label: 'Likes', value: formatK(reel.likesCount) },
    { Icon: Bookmark, label: 'Guardados', value: formatK(reel.savesCount) },
    { Icon: MessageCircle, label: 'Comentarios', value: formatK(reel.commentsCount) },
    { Icon: Share2, label: 'Compartidos', value: formatK(reel.sharesCount) },
  ]

  return (
    <div className="px-6 py-6 md:px-8">
      {/* Back */}
      <Link
        href="/instagram"
        className="inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <ArrowLeft size={14} /> Volver a Instagram
      </Link>

      {/* Card */}
      <div
        className="mt-4 grid gap-6 rounded-2xl p-5 md:grid-cols-[280px_1fr] md:p-6"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Thumbnail */}
        <div
          className="overflow-hidden rounded-xl"
          style={{ aspectRatio: '9/16', backgroundColor: 'var(--muted)' }}
        >
          {reel.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- IG CDN URLs rotate, would need wildcard remotePatterns
            <img
              src={reel.thumbnailUrl}
              alt={reel.caption ?? 'Reel thumbnail'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Sin miniatura
            </div>
          )}
        </div>

        {/* Meta + stats */}
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              <span className="flex items-center gap-1">
                <Clock size={12} /> {formatDuration(reel.durationSec)}
              </span>
              <span>•</span>
              <span>Publicado: {formatDate(reel.publishedAt)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {reel.caption ?? <em style={{ color: 'var(--muted-foreground)' }}>(Sin descripción)</em>}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {stats.map(({ Icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl p-3"
                style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
              >
                <Icon size={14} style={{ color: 'var(--muted-foreground)' }} />
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                  {label}
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Additional metrics (if present) */}
          {(reel.reachCount > 0 || reel.impressions > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {reel.reachCount > 0 && (
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                    Alcance
                  </p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                    {formatK(reel.reachCount)}
                  </p>
                </div>
              )}
              {reel.impressions > 0 && (
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                    Impresiones
                  </p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                    {formatK(reel.impressions)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={reel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--foreground)',
                color: 'var(--background)',
              }}
            >
              Ver en Instagram <ExternalLink size={12} />
            </a>
            {reel.videoUrl && (
              <a
                href={reel.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--card)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                Descargar video <ExternalLink size={12} />
              </a>
            )}
          </div>

          <p className="text-[10px]" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
            Analytics avanzado (benchmarks, retención, mejor día) próximamente.
          </p>
        </div>
      </div>
    </div>
  )
}
