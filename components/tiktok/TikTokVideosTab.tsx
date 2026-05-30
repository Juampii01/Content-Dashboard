'use client'

import { Eye, ThumbsUp, MessageSquare, Share2, Loader2, Film } from 'lucide-react'
import { formatK } from '@/lib/utils/formatters'
import { usePeriod } from '@/hooks/usePeriod'
import { useTikTokVideos, type TikTokVideoRow } from '@/hooks/useTikTokData'

interface Props {
  connected: boolean
  hasData: boolean
  videos?: TikTokVideoRow[]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  loadMore?: () => Promise<void>
}

function formatDuration(sec: number): string {
  if (sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}s`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function TikTokVideosTab({
  connected,
  hasData,
  videos: videosProp,
  loading: loadingProp,
  loadingMore: loadingMoreProp,
  hasMore: hasMoreProp,
  loadMore: loadMoreProp,
}: Props) {
  const [period] = usePeriod()
  const {
    videos: videosOwn,
    loading: loadingOwn,
    loadingMore: loadingMoreOwn,
    hasMore: hasMoreOwn,
    loadMore: loadMoreOwn,
  } = useTikTokVideos({
    enabled: connected && videosProp === undefined,
    pageSize: 25,
  })

  const videos = videosProp ?? videosOwn
  const loading = loadingProp ?? loadingOwn
  const loadingMore = loadingMoreProp ?? loadingMoreOwn
  const hasMore = hasMoreProp ?? hasMoreOwn
  const loadMore = loadMoreProp ?? loadMoreOwn

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - period)
  const filtered: TikTokVideoRow[] = period === 0
    ? videos
    : videos.filter((v) => !v.publishedAt || new Date(v.publishedAt) >= cutoff)

  if (!connected) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <Film size={20} style={{ color: 'var(--muted-foreground)' }} className="mx-auto" />
        <p className="text-sm mt-3" style={{ color: 'var(--muted-foreground)' }}>
          Conecta tu cuenta para ver los videos sincronizados.
        </p>
      </div>
    )
  }

  if (loading && videos.length === 0) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-48 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }} className="flex gap-4 px-4 py-3">
            {[120, 50, 60, 55, 65, 50, 40].map((w, i) => (
              <div key={i} className="h-3 rounded animate-pulse shrink-0" style={{ width: w, backgroundColor: 'var(--border)' }} />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5" style={{ borderBottom: i < 7 ? '1px solid var(--border)' : undefined, backgroundColor: 'var(--card)' }}>
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 rounded animate-pulse" style={{ width: `${55 + (i * 19) % 40}%`, backgroundColor: 'var(--muted)', animationDelay: `${i * 40}ms` }} />
                <div className="h-2.5 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)', animationDelay: `${i * 40 + 20}ms` }} />
              </div>
              {[40, 60, 55, 60, 50, 40].map((w, j) => (
                <div key={j} className="h-3 rounded animate-pulse shrink-0" style={{ width: w, backgroundColor: 'var(--muted)', animationDelay: `${i * 40 + j * 15}ms` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!hasData || videos.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Aún no hay videos sincronizados.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Pulsa &quot;Sincronizar&quot; para importar los últimos videos de tu cuenta.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {filtered.length} video{filtered.length === 1 ? '' : 's'}{' '}
          {period === 0 ? 'todos los videos' : `en los últimos ${period} días`}
          {period !== 0 && videos.length !== filtered.length ? ` · ${videos.length} totales sincronizados` : ''}
        </span>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              {['Video', 'Duración', 'Vistas', 'Likes', 'Comentarios', 'Compartidos'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-xs"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {period === 0
                    ? 'No hay videos sincronizados.'
                    : `No hay videos publicados en los últimos ${period} días.`}
                </td>
              </tr>
            ) : (
              filtered.map((v, i) => (
                <tr
                  key={v.id}
                  style={{
                    backgroundColor: 'var(--card)',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <td className="px-4 py-3 max-w-[260px]">
                    <a
                      href={v.shareUrl || undefined}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium truncate block hover:underline"
                      style={{ color: 'var(--foreground)' }}
                      title={v.title}
                    >
                      {v.title || '(Sin título)'}
                    </a>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      {v.publishedAt
                        ? new Date(v.publishedAt).toLocaleDateString('es', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </td>
                  <td
                    className="px-4 py-3 tabular-nums text-xs"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {formatDuration(v.durationSec)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1 tabular-nums text-xs"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <Eye size={12} style={{ color: 'var(--muted-foreground)' }} />
                      {formatK(v.viewCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1 tabular-nums text-xs"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <ThumbsUp size={12} style={{ color: 'var(--muted-foreground)' }} />
                      {formatK(v.likeCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1 tabular-nums text-xs"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <MessageSquare size={12} style={{ color: 'var(--muted-foreground)' }} />
                      {formatK(v.commentCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1 tabular-nums text-xs"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <Share2 size={12} style={{ color: 'var(--muted-foreground)' }} />
                      {formatK(v.shareCount)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--muted)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            {loadingMore ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Cargando…
              </>
            ) : (
              'Cargar más'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
