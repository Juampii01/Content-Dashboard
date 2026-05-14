'use client'

import { STORIES } from '@/lib/mock-data/historias'
import { formatK } from '@/lib/utils/formatters'
import { Eye, MessageSquare, MousePointer, LogOut } from 'lucide-react'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'

export function HistoriasTab() {
  const { hasRealData, stories } = useInstagramDataContext()

  interface StoryItem {
    id: string
    thumbnailUrl?: string | null
    publishedAt: string | null
    reach: number
    replies: number
    stickerTaps: number
    exits: number
    completionRate: number
  }

  const source: StoryItem[] =
    hasRealData && stories.length > 0
      ? stories.map(s => ({
          id: s.id,
          thumbnailUrl: s.thumbnailUrl,
          publishedAt: s.publishedAt ? s.publishedAt.slice(0, 10) : s.syncedAt.slice(0, 10),
          reach: s.reach,
          replies: s.replies,
          stickerTaps: s.stickerTaps,
          exits: s.exits,
          completionRate: s.completionRate,
        }))
      : STORIES.map(s => ({
          id: s.id,
          thumbnailUrl: null,
          publishedAt: s.publishedAt,
          reach: s.reach,
          replies: s.replies,
          stickerTaps: s.stickerTaps,
          exits: s.exits,
          completionRate: s.completionRate,
        }))

  const usingMock = !hasRealData || stories.length === 0
  const totalReach = source.reduce((s, h) => s + h.reach, 0)
  const avgCompletion = source.length > 0
    ? Math.round(source.reduce((s, h) => s + h.completionRate, 0) / source.length)
    : 0

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        {usingMock && (
          <div className="flex items-center justify-end mb-4">
            <DemoDataPill />
          </div>
        )}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'ALCANCE TOTAL', value: formatK(totalReach), icon: <Eye size={14} /> },
            { label: 'HISTORIAS', value: source.length.toString(), icon: null },
            { label: 'TASA COMPLETACIÓN', value: `${avgCompletion}%`, icon: null },
            { label: 'REPLIES TOTALES', value: formatK(source.reduce((s, h) => s + h.replies, 0)), icon: <MessageSquare size={14} /> },
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
          {source.map(story => (
            <div key={story.id} className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="aspect-[9/16] max-h-40 flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: 'var(--muted)' }}>
                {story.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={story.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">📖</span>
                )}
              </div>
              <div className="p-3 space-y-1.5">
                <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{story.publishedAt}</p>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                    <Eye size={10} />{formatK(story.reach)}
                  </div>
                  <div className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                    <MessageSquare size={10} />{story.replies}
                  </div>
                  <div className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                    <MousePointer size={10} />{story.stickerTaps}
                  </div>
                  <div className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                    <LogOut size={10} />{story.exits}
                  </div>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
                  <div className="h-full rounded-full" style={{ width: `${story.completionRate}%`, backgroundColor: 'var(--accent)' }} />
                </div>
                <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{story.completionRate}% completado</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
