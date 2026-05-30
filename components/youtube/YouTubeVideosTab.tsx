'use client'

import { Eye, ThumbsUp, MessageSquare, MousePointerClick, Loader2, Film } from 'lucide-react'
import { formatK } from '@/lib/utils/formatters'
import { usePeriod } from '@/hooks/usePeriod'
import { useYouTubeVideos, type YouTubeVideoRow } from '@/hooks/useYouTubeData'

interface Props {
  connected: boolean
  hasData: boolean
}

export function YouTubeVideosTab({ connected, hasData }: Props) {
  const [period] = usePeriod()
  const { videos, loading, loadingMore, hasMore, loadMore } = useYouTubeVideos({
    enabled: connected,
    pageSize: 25,
  })

  const filtered: YouTubeVideoRow[] =
    period === 0
      ? videos
      : (() => {
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - period)
          return videos.filter(
            (v) => !v.publishedAt || new Date(v.publishedAt) >= cutoff,
          )
        })()

  if (!connected) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <Film size={20} style={{ color: 'var(--muted-foreground)' }} className="mx-auto" />
        <p className="text-sm mt-3" style={{ color: 'var(--muted-foreground)' }}>
          Conecta tu canal para ver los videos sincronizados.
        </p>
      </div>
    )
  }

  if (loading && videos.length === 0) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-48 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }} className="grid grid-cols-7 px-4 py-3 gap-4">
            {[120, 60, 60, 50, 80, 40, 80].map((w, i) => (
              <div key={i} className="h-3 rounded animate-pulse" style={{ width: w, backgroundColor: 'var(--border)' }} />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5" style={{ borderBottom: i < 7 ? '1px solid var(--border)' : undefined, backgroundColor: 'var(--card)' }}>
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 rounded animate-pulse" style={{ width: `${60 + (i * 17) % 35}%`, backgroundColor: 'var(--muted)', animationDelay: `${i * 40}ms` }} />
                <div className="h-2.5 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)', animationDelay: `${i * 40 + 20}ms` }} />
              </div>
              {[40, 60, 50, 60, 40, 60].map((w, j) => (
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
          Pulsa “Sincronizar” para importar los últimos videos de tu canal.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {filtered.length} video{filtered.length === 1 ? '' : 's'}{period === 0 ? ' en total' : ` en los últimos ${period} días`}
          {videos.length !== filtered.length ? ` · ${videos.length} totales sincronizados` : ''}
        </span>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              {['Video', 'Duración', 'Vistas', 'Likes', 'Comentarios', 'CTR', 'Retención'].map((h) => (
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
                  colSpan={7}
                  className="px-4 py-8 text-center text-xs"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {period === 0 ? 'No hay videos sincronizados.' : `No hay videos publicados en los últimos ${period} días.`}
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
                      href={v.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium truncate block hover:underline"
                      style={{ color: 'var(--foreground)' }}
                      title={v.title}
                    >
                      {v.title}
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
                    {v.durationLabel || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1 tabular-nums text-xs"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <Eye size={12} style={{ color: 'var(--muted-foreground)' }} />
                      {formatK(v.viewsCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1 tabular-nums text-xs"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <ThumbsUp size={12} style={{ color: 'var(--muted-foreground)' }} />
                      {formatK(v.likesCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1 tabular-nums text-xs"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <MessageSquare size={12} style={{ color: 'var(--muted-foreground)' }} />
                      {formatK(v.commentsCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1 tabular-nums text-xs"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <MousePointerClick size={12} style={{ color: 'var(--muted-foreground)' }} />
                      {v.ctr !== null ? `${v.ctr}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.averageViewPercent !== null ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--muted)', minWidth: 60 }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${v.averageViewPercent}%`,
                              backgroundColor: 'var(--accent)',
                            }}
                          />
                        </div>
                        <span
                          className="text-xs tabular-nums"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          {v.averageViewPercent}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        —
                      </span>
                    )}
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
