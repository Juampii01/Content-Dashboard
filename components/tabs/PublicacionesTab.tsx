'use client'

import { POSTS } from '@/lib/mock-data/publicaciones'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { Eye, Heart, Bookmark, MessageCircle } from 'lucide-react'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'

export function PublicacionesTab() {
  const { hasRealData, reels, summary } = useInstagramDataContext()

  // Photos and carousels have no videoUrl; videos/reels do.
  const realPosts = hasRealData ? reels.filter(r => !r.videoUrl) : null
  const followers = summary?.latestSnapshot?.followers ?? 0

  interface PostItem {
    id: string
    thumbnailUrl: string | null
    caption: string
    publishedAt: string
    reach: number
    likes: number
    saves: number
    comments: number
    engagementRate: number
  }

  const source: PostItem[] = realPosts
    ? realPosts.map(r => {
        const likes = r.likesCount
        const saves = r.savesCount ?? 0
        const comments = r.commentsCount
        const reach = r.reachCount ?? 0
        const engagementRate =
          followers > 0
            ? Math.round(((likes + saves + comments) / followers) * 1000) / 10
            : 0
        return {
          id: r.id,
          thumbnailUrl: r.thumbnailUrl,
          caption: r.caption ?? '',
          publishedAt: (r.publishedAt ?? r.syncedAt).slice(0, 10),
          reach,
          likes,
          saves,
          comments,
          engagementRate,
        }
      })
    : POSTS.map(p => ({
        id: p.id,
        thumbnailUrl: null,
        caption: p.caption,
        publishedAt: p.publishedAt,
        reach: p.reach,
        likes: p.likes,
        saves: p.saves,
        comments: p.comments,
        engagementRate: p.engagementRate,
      }))

  const totalReach = source.reduce((s, p) => s + p.reach, 0)
  const avgEng = source.length > 0
    ? (source.reduce((s, p) => s + p.engagementRate, 0) / source.length).toFixed(1)
    : '0.0'

  return (
    <div>
      {!hasRealData && (
        <div className="flex items-center justify-end mb-4">
          <DemoDataPill />
        </div>
      )}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'PUBLICACIONES', value: source.length.toString() },
          { label: 'ALCANCE TOTAL', value: formatK(totalReach) },
          { label: 'ENG. PROMEDIO', value: `${avgEng}%` },
          { label: 'GUARDADOS TOTALES', value: formatK(source.reduce((s, p) => s + p.saves, 0)) },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-xs tracking-wide uppercase mb-2" style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {source.map(post => (
          <div key={post.id} className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="aspect-square flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: 'var(--muted)' }}>
              {post.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">🖼</span>
              )}
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
