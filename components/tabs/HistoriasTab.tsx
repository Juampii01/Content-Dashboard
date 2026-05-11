'use client'

import { STORIES } from '@/lib/mock-data/historias'
import { formatK } from '@/lib/utils/formatters'
import { Eye, MessageSquare, MousePointer, LogOut } from 'lucide-react'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'

export function HistoriasTab() {
  const totalReach = STORIES.reduce((s, h) => s + h.reach, 0)
  const avgCompletion = Math.round(STORIES.reduce((s, h) => s + h.completionRate, 0) / STORIES.length)

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="mb-3"><DemoDataPill /></div>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'ALCANCE TOTAL', value: formatK(totalReach), icon: <Eye size={14} /> },
            { label: 'HISTORIAS', value: STORIES.length.toString(), icon: null },
            { label: 'TASA COMPLETACIÓN', value: `${avgCompletion}%`, icon: null },
            { label: 'REPLIES TOTALES', value: formatK(STORIES.reduce((s, h) => s + h.replies, 0)), icon: <MessageSquare size={14} /> },
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
          {STORIES.map(story => (
            <div key={story.id} className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="aspect-[9/16] max-h-40 flex items-center justify-center"
                style={{ backgroundColor: 'var(--muted)' }}>
                <span className="text-3xl">📖</span>
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
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--accent)' }}>
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
