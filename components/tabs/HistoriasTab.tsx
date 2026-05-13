'use client'

import Image from 'next/image'
import { STORIES } from '@/lib/mock-data/historias'
import { formatK } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/formatDate'
import { Eye, MessageSquare, MousePointer, LogOut, Loader2, RefreshCw } from 'lucide-react'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'

type StoryView = {
  id: string
  thumbnail: string | null
  publishedAt: string | null
  reach: number | null
  replies: number | null
  stickerTaps: number | null
  exits: number | null
  completionRate: number | null
}

export function HistoriasTab() {
  const { connected, stories: realStories, syncStories, syncingStories } = useInstagramDataContext()

  const showReal = connected && realStories.length > 0
  const showRealButEmpty = connected && realStories.length === 0

  const stories: StoryView[] = showReal
    ? realStories.map((s) => ({
        id: s.id,
        thumbnail: s.thumbnailUrl,
        publishedAt: s.publishedAt,
        // Insights gated behind Meta App Review — null renders as "—"
        reach: s.reach > 0 ? s.reach : null,
        replies: s.replies > 0 ? s.replies : null,
        stickerTaps: s.stickerTaps > 0 ? s.stickerTaps : null,
        exits: s.exits > 0 ? s.exits : null,
        completionRate: s.completionRate > 0 ? s.completionRate : null,
      }))
    : STORIES.map((s) => ({
        id: s.id,
        thumbnail: null,
        publishedAt: s.publishedAt,
        reach: s.reach,
        replies: s.replies,
        stickerTaps: s.stickerTaps,
        exits: s.exits,
        completionRate: s.completionRate,
      }))

  const totalReach = stories.reduce((s, h) => s + (h.reach ?? 0), 0)
  const completionValues = stories
    .map((h) => h.completionRate)
    .filter((v): v is number => v !== null)
  const avgCompletion =
    completionValues.length > 0
      ? Math.round(completionValues.reduce((s, v) => s + v, 0) / completionValues.length)
      : null
  const totalReplies = stories.reduce((s, h) => s + (h.replies ?? 0), 0)

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="mb-3 flex items-center gap-2">
          {showReal ? (
            <>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--border))',
                }}
                title="Métricas detalladas (reach/replies/exits/completion) requieren Meta App Review"
              >
                Data real · sin métricas privadas
              </span>
              <button
                type="button"
                onClick={syncStories}
                disabled={syncingStories}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--card)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                {syncingStories ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                {syncingStories ? 'Sincronizando…' : 'Re-sincronizar stories'}
              </button>
            </>
          ) : (
            <>
              <DemoDataPill />
              {connected && (
                <button
                  type="button"
                  onClick={syncStories}
                  disabled={syncingStories}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-foreground)',
                  }}
                >
                  {syncingStories ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                  {syncingStories ? 'Sincronizando…' : 'Traer stories activas'}
                </button>
              )}
            </>
          )}
        </div>

        {showRealButEmpty ? (
          <div
            className="rounded-2xl p-10 text-center text-sm"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
          >
            Tu cuenta no tiene stories activas en este momento. Stories duran 24h — tocá "Traer stories activas" arriba para sincronizar lo que está live.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'ALCANCE TOTAL', value: totalReach > 0 ? formatK(totalReach) : '—', icon: <Eye size={14} /> },
                { label: 'HISTORIAS', value: stories.length.toString(), icon: null },
                { label: 'TASA COMPLETACIÓN', value: avgCompletion !== null ? `${avgCompletion}%` : '—', icon: null },
                { label: 'REPLIES TOTALES', value: totalReplies > 0 ? formatK(totalReplies) : '—', icon: <MessageSquare size={14} /> },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs tracking-wide uppercase" style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
                    {m.icon && <span style={{ color: 'var(--muted-foreground)' }}>{m.icon}</span>}
                  </div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{m.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-4">
              {stories.map(story => (
                <div key={story.id} className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="relative aspect-[9/16] max-h-40 overflow-hidden"
                    style={{ backgroundColor: 'var(--muted)' }}>
                    {story.thumbnail ? (
                      <Image
                        src={story.thumbnail}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl">📖</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                      {story.publishedAt ? formatDate(story.publishedAt) : '—'}
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                        <Eye size={10} /> {story.reach !== null ? formatK(story.reach) : '—'}
                      </span>
                      <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                        <MessageSquare size={10} /> {story.replies !== null ? formatK(story.replies) : '—'}
                      </span>
                      <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                        <MousePointer size={10} /> {story.stickerTaps !== null ? formatK(story.stickerTaps) : '—'}
                      </span>
                      <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                        <LogOut size={10} /> {story.exits !== null ? formatK(story.exits) : '—'}
                      </span>
                    </div>
                    {story.completionRate !== null && (
                      <div className="mt-1 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                        {story.completionRate}% completación
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
