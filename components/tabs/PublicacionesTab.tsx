'use client'

import { POSTS } from '@/lib/mock-data/publicaciones'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { Eye, Heart, Bookmark, MessageCircle } from 'lucide-react'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'

export function PublicacionesTab() {
  const totalReach = POSTS.reduce((s, p) => s + p.reach, 0)
  const avgEng = (POSTS.reduce((s, p) => s + p.engagementRate, 0) / POSTS.length).toFixed(1)

  return (
    <div>
      <div className="mb-3"><DemoDataPill /></div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'PUBLICACIONES', value: POSTS.length.toString() },
          { label: 'ALCANCE TOTAL', value: formatK(totalReach) },
          { label: 'ENG. PROMEDIO', value: `${avgEng}%` },
          { label: 'GUARDADOS TOTALES', value: formatK(POSTS.reduce((s, p) => s + p.saves, 0)) },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-xs tracking-wide uppercase mb-2" style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {POSTS.map(post => (
          <div key={post.id} className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="aspect-square flex items-center justify-center"
              style={{ backgroundColor: 'var(--muted)' }}>
              <span className="text-4xl">🖼</span>
            </div>
            <div className="p-3">
              <p className="text-[11px] line-clamp-2 mb-2" style={{ color: 'var(--foreground)' }}>{post.caption}</p>
              <p className="text-[10px] mb-2" style={{ color: 'var(--muted-foreground)' }}>{post.publishedAt}</p>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}><Eye size={10} />{formatK(post.reach)}</span>
                <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}><Heart size={10} />{formatK(post.likes)}</span>
                <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}><Bookmark size={10} />{formatK(post.saves)}</span>
                <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}><MessageCircle size={10} />{formatK(post.comments)}</span>
              </div>
              <div className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                {formatPercent(post.engagementRate)} eng.
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
