'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid, List, Eye, ThumbsUp, MessageCircle, PlaySquare } from 'lucide-react'
import type { YouTubeVideoRow } from '@/hooks/useYouTubeData'
import { YTVideoCard } from './YTVideoCard'
import { fmtViews, fmtDuration } from './yt-theme'

type SortKey = 'recent' | 'views' | 'likes' | 'comments'

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'recent', label: 'Reciente' },
  { id: 'views', label: 'Más vistos' },
  { id: 'likes', label: 'Más likes' },
  { id: 'comments', label: 'Más comentarios' },
]

interface YTVideoGridProps {
  videos: YouTubeVideoRow[]
  loading: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
}

export function YTVideoGrid({
  videos,
  loading,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
}: YTVideoGridProps) {
  const [sort, setSort] = useState<SortKey>('recent')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const avgViews = useMemo(() => {
    if (videos.length === 0) return 0
    return Math.round(videos.reduce((sum, v) => sum + v.viewsCount, 0) / videos.length)
  }, [videos])

  const sorted = useMemo(() => {
    const copy = [...videos]
    switch (sort) {
      case 'views':
        return copy.sort((a, b) => b.viewsCount - a.viewsCount)
      case 'likes':
        return copy.sort((a, b) => b.likesCount - a.likesCount)
      case 'comments':
        return copy.sort((a, b) => b.commentsCount - a.commentsCount)
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
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 flex-wrap">
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
              ? 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
              : 'flex flex-col gap-2'
          }
        >
          {Array.from({ length: 8 }).map((_, i) =>
            view === 'grid' ? (
              <div key={i} className="rounded-xl bg-muted animate-pulse aspect-video" />
            ) : (
              <div key={i} className="rounded-xl bg-muted animate-pulse h-20" />
            ),
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PlaySquare className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">
            Sin videos — hacé un Sync para cargar tus últimos uploads.
          </p>
        </div>
      )}

      {/* Grid */}
      {videos.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sorted.map((video) => (
            <YTVideoCard key={video.id} video={video} avgViews={avgViews} />
          ))}
        </div>
      )}

      {/* List */}
      {videos.length > 0 && view === 'list' && (
        <div className="flex flex-col gap-2">
          {sorted.map((video) => {
            const durationLabel =
              video.durationLabel || (video.durationSec > 0 ? fmtDuration(video.durationSec) : null)
            return (
              <div
                key={video.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-border transition-colors"
              >
                <div className="relative w-28 aspect-video rounded-lg bg-muted overflow-hidden shrink-0">
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlaySquare className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                  {durationLabel && (
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono">
                      {durationLabel}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {video.title || 'Sin título'}
                  </p>
                  {video.publishedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(video.publishedAt).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-foreground font-medium">
                    <Eye className="w-3.5 h-3.5" />
                    {fmtViews(video.viewsCount)}
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {fmtViews(video.likesCount)}
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {fmtViews(video.commentsCount)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 rounded-lg text-sm font-medium border border-border/60 hover:bg-muted transition-colors disabled:opacity-60"
          >
            {loadingMore ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}

      {/* Footer */}
      {videos.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          {videos.length} videos · Avg {fmtViews(avgViews)} vistas
        </p>
      )}
    </div>
  )
}
