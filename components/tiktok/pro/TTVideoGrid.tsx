'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import type { TikTokVideoRow } from '@/hooks/useTikTokData'
import { TTVideoCard } from './TTVideoCard'
import { fmtTT, TT_TEAL } from './tt-theme'

type SortKey = 'recent' | 'views' | 'likes' | 'shares'

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'recent', label: 'Reciente' },
  { id: 'views', label: 'Más vistos' },
  { id: 'likes', label: 'Más likes' },
  { id: 'shares', label: 'Más shares' },
]

interface TTVideoGridProps {
  videos: TikTokVideoRow[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

export function TTVideoGrid({ videos, loading, hasMore, onLoadMore }: TTVideoGridProps) {
  const [sort, setSort] = useState<SortKey>('recent')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const avgViews = useMemo(() => {
    if (videos.length === 0) return 0
    return Math.round(videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length)
  }, [videos])

  const sorted = useMemo(() => {
    const copy = [...videos]
    switch (sort) {
      case 'views':
        return copy.sort((a, b) => b.viewCount - a.viewCount)
      case 'likes':
        return copy.sort((a, b) => b.likeCount - a.likeCount)
      case 'shares':
        return copy.sort((a, b) => b.shareCount - a.shareCount)
      case 'recent':
      default:
        return copy.sort((a, b) => {
          const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
          const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
          return db - da
        })
    }
  }, [videos, sort])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSort(opt.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                sort === opt.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">{videos.length} videos</span>
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              view === 'grid' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-md transition-colors ${
              view === 'list' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && videos.length === 0 && (
        <div
          className={
            view === 'grid'
              ? 'grid grid-cols-3 gap-3'
              : 'flex flex-col gap-2'
          }
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-muted animate-pulse"
              style={view === 'grid' ? { paddingTop: '177.78%' } : { height: 80 }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">
            Sin videos — haz un Sync para cargar tus últimos videos.
          </p>
        </div>
      )}

      {/* Grid */}
      {videos.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-3 gap-3">
          {sorted.map((video) => (
            <TTVideoCard key={video.id} video={video} avgViews={avgViews} />
          ))}
        </div>
      )}

      {/* List */}
      {videos.length > 0 && view === 'list' && (
        <div className="flex flex-col gap-2">
          {sorted.map((video) => (
            <div
              key={video.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-border transition-colors"
            >
              <div className="w-12 h-[85px] rounded-lg bg-muted overflow-hidden shrink-0">
                {video.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.coverUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {video.title || 'Sin título'}
                </p>
                {video.publishedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(video.publishedAt).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0 text-sm">
                <span className="text-foreground font-medium">{fmtTT(video.viewCount)}</span>
                <span className="text-muted-foreground">{fmtTT(video.likeCount)}</span>
                <span style={{ color: TT_TEAL }}>{fmtTT(video.shareCount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onLoadMore}
            className="px-6 py-2 rounded-lg text-sm font-medium border border-border/60 hover:bg-muted transition-colors"
          >
            Cargar más
          </button>
        </div>
      )}
    </div>
  )
}
