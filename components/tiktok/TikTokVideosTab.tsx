'use client'

import { useState, useMemo } from 'react'
import { Eye, Heart, Share2, MessageCircle, Play, ArrowUpDown } from 'lucide-react'
import { getTikTokVideos, type TikTokVideo } from '@/lib/mock-data/tiktok'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils'
import { usePeriod } from '@/hooks/usePeriod'

type SortKey = 'publishedAt' | 'views' | 'likes' | 'shares' | 'comments' | 'engagementRate'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'publishedAt', label: 'Más recientes' },
  { key: 'views', label: 'Más vistas' },
  { key: 'likes', label: 'Más likes' },
  { key: 'shares', label: 'Más shares' },
  { key: 'engagementRate', label: 'Mayor engagement' },
]

function VideoCard({ video }: { video: TikTokVideo }) {
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Thumbnail placeholder */}
      <div
        className="relative flex items-center justify-center"
        style={{ aspectRatio: '9/16', maxHeight: 220, backgroundColor: 'var(--muted)' }}
      >
        <Play size={32} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />
        <span
          className="absolute bottom-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
        >
          {video.duration}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <p
          className="text-sm font-medium line-clamp-2 leading-snug"
          style={{ color: 'var(--foreground)' }}
        >
          {video.title}
        </p>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {video.publishedAt}
        </p>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2">
          <MetricPill icon={<Eye size={11} />} value={formatK(video.views)} label="vistas" />
          <MetricPill icon={<Heart size={11} />} value={formatK(video.likes)} label="likes" />
          <MetricPill icon={<Share2 size={11} />} value={formatK(video.shares)} label="shares" />
          <MetricPill icon={<MessageCircle size={11} />} value={formatK(video.comments)} label="comments" />
        </div>

        {/* Engagement badge */}
        <div className="flex items-center justify-between mt-auto pt-2"
          style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Engagement</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            {formatPercent(video.engagementRate)}
          </span>
        </div>
      </div>
    </div>
  )
}

function MetricPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
      style={{ backgroundColor: 'var(--muted)' }}
    >
      <span style={{ color: 'var(--muted-foreground)' }}>{icon}</span>
      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{value}</span>
      <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
    </div>
  )
}

export function TikTokVideosTab() {
  const [period] = usePeriod()
  const [sortKey, setSortKey] = useState<SortKey>('views')

  const sorted = useMemo(() => {
    const filtered = getTikTokVideos(period)
    return filtered.sort((a, b) => {
      if (sortKey === 'publishedAt') {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      }
      return (b[sortKey] as number) - (a[sortKey] as number)
    })
  }, [period, sortKey])

  return (
    <div className="space-y-5">
      {/* Sort bar */}
      <div className="flex items-center gap-2">
        <ArrowUpDown size={14} style={{ color: 'var(--muted-foreground)' }} />
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Ordenar por:</span>
        <div className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                sortKey !== key && 'hover:opacity-80'
              )}
              style={{
                backgroundColor: sortKey === key ? 'var(--accent)' : 'transparent',
                color: sortKey === key ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <p className="text-center text-xs py-8" style={{ color: 'var(--muted-foreground)' }}>
          No hay videos publicados en los últimos {period} días.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-4 xl:grid-cols-4">
          {sorted.map(v => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  )
}
