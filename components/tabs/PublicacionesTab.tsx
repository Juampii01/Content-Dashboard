'use client'

import { useMemo } from 'react'
import { Eye, Heart, Bookmark, MessageCircle, Image } from 'lucide-react'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { userReelToView } from '@/lib/instagram/to-reel-view'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'
import { POSTS } from '@/lib/mock-data/publicaciones'

export function PublicacionesTab() {
  const { hasRealData, reels: realReels } = useInstagramDataContext()

  const posts = useMemo(() => {
    if (!hasRealData) return null
    // All synced media are publications (photos, carousels, videos)
    return realReels.map(userReelToView)
  }, [hasRealData, realReels])

  const totalLikes = posts
    ? posts.reduce((s, p) => s + p.likes, 0)
    : POSTS.reduce((s, p) => s + p.likes, 0)
  const totalComments = posts
    ? posts.reduce((s, p) => s + p.comments, 0)
    : POSTS.reduce((s, p) => s + p.comments, 0)
  const count = posts ? posts.length : POSTS.length
  const avgEng = posts && posts.length > 0
    ? ((totalLikes + totalComments) / posts.length / 1000 * 100).toFixed(1)
    : (POSTS.reduce((s, p) => s + p.engagementRate, 0) / POSTS.length).toFixed(1)

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div />
        {!hasRealData && <DemoDataPill />}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'PUBLICACIONES', value: count.toString() },
          { label: 'TOTAL LIKES', value: formatK(totalLikes) },
          { label: 'TOTAL COMENTARIOS', value: formatK(totalComments) },
          { label: 'ENG. PROMEDIO', value: `${avgEng}%` },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-xs tracking-wide uppercase mb-2" style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-4 gap-4">
        {(posts ?? POSTS).map(post => (
          <div
            key={post.id}
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            {/* Thumbnail */}
            <div
              className="aspect-square flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              {'thumbnail' in post && (post as { thumbnail?: string }).thumbnail ? (
                <img
                  src={(post as { thumbnail: string }).thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              {'caption' in post && (post as { caption?: string }).caption ? (
                <p className="text-[11px] line-clamp-2 mb-2" style={{ color: 'var(--foreground)' }}>
                  {(post as { caption: string }).caption}
                </p>
              ) : (
                <p className="text-[11px] line-clamp-2 mb-2" style={{ color: 'var(--foreground)' }}>
                  {'title' in post ? String((post as { title?: string }).title ?? '') : ''}
                </p>
              )}
              <p className="text-[10px] mb-2" style={{ color: 'var(--muted-foreground)' }}>
                {'publishedAt' in post ? String((post as { publishedAt?: string }).publishedAt ?? '') : ''}
              </p>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                  <Heart size={10} />{formatK(post.likes)}
                </span>
                <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                  <MessageCircle size={10} />{formatK(post.comments)}
                </span>
                {!hasRealData && (
                  <>
                    <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                      <Eye size={10} />{formatK(('reach' in post ? (post as { reach: number }).reach : 0))}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                      <Bookmark size={10} />{formatK(('saves' in post ? (post as { saves: number }).saves : 0))}
                    </span>
                  </>
                )}
              </div>
              {!hasRealData && (
                <div className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                  {formatPercent(('engagementRate' in post ? (post as { engagementRate: number }).engagementRate : 0))} eng.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
