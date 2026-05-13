'use client'

import { POSTS } from '@/lib/mock-data/publicaciones'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { Eye, Heart, Bookmark, MessageCircle } from 'lucide-react'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'

type PostView = {
  id: string
  caption: string
  thumbnailUrl: string | null
  publishedAt: string
  likes: number
  comments: number
  // These four require Meta App Review (instagram_manage_insights).
  // When unavailable we render an em dash.
  reach: number | null
  saves: number | null
  engagementRate: number | null
}

const NON_VIDEO = (mt: string | null | undefined): boolean =>
  mt === 'IMAGE' || mt === 'CAROUSEL_ALBUM'

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

export function PublicacionesTab() {
  const { hasRealData, reels } = useInstagramDataContext()

  // Real posts come from the same UserReel table; we filter by media_type so
  // reels stay in the Reels tab and only carousels / images surface here.
  const realPosts: PostView[] = reels
    .filter((r) => NON_VIDEO(r.mediaType))
    .map((r) => ({
      id: r.id,
      caption: r.caption ?? '',
      thumbnailUrl: r.thumbnailUrl,
      publishedAt: r.publishedAt ?? r.syncedAt,
      likes: r.likesCount,
      comments: r.commentsCount,
      // Reach / saves / engagement are gated behind insights scope; null here
      // means "tu cuenta todavía no nos da este dato".
      reach: null,
      saves: null,
      engagementRate: null,
    }))

  const showReal = hasRealData && realPosts.length > 0
  const showRealButEmpty = hasRealData && realPosts.length === 0

  const posts: PostView[] = showReal
    ? realPosts
    : POSTS.map((p) => ({
        id: p.id,
        caption: p.caption,
        thumbnailUrl: null,
        publishedAt: p.publishedAt,
        likes: p.likes,
        comments: p.comments,
        reach: p.reach,
        saves: p.saves,
        engagementRate: p.engagementRate,
      }))

  const totalReach = posts.reduce((s, p) => s + (p.reach ?? 0), 0)
  const totalSaves = posts.reduce((s, p) => s + (p.saves ?? 0), 0)
  const engValues = posts.map((p) => p.engagementRate).filter((v): v is number => v !== null)
  const avgEng = engValues.length > 0
    ? (engValues.reduce((s, v) => s + v, 0) / engValues.length).toFixed(1)
    : null

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {!showReal && <DemoDataPill />}
        {showReal && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--border))',
            }}
            title="Métricas detalladas (reach/saves/eng.) requieren Meta App Review"
          >
            Data real · métricas básicas
          </span>
        )}
      </div>

      {showRealButEmpty ? (
        <div
          className="rounded-2xl p-10 text-center text-sm"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
        >
          Tu cuenta no tiene publicaciones (carousels o imágenes) sincronizadas. Cuando publiques una, va a aparecer acá tras el próximo sync.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'PUBLICACIONES', value: posts.length.toString() },
              { label: 'ALCANCE TOTAL', value: totalReach > 0 ? formatK(totalReach) : '—' },
              { label: 'ENG. PROMEDIO', value: avgEng ? `${avgEng}%` : '—' },
              { label: 'GUARDADOS TOTALES', value: totalSaves > 0 ? formatK(totalSaves) : '—' },
            ].map(m => (
              <div key={m.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-xs tracking-wide uppercase mb-2" style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{m.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {posts.map(post => (
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
                  <p className="text-[11px] line-clamp-2 mb-2" style={{ color: 'var(--foreground)' }}>{post.caption || '(sin caption)'}</p>
                  <p className="text-[10px] mb-2" style={{ color: 'var(--muted-foreground)' }}>{formatDateShort(post.publishedAt)}</p>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                      <Eye size={10} />{post.reach !== null ? formatK(post.reach) : '—'}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                      <Heart size={10} />{formatK(post.likes)}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                      <Bookmark size={10} />{post.saves !== null ? formatK(post.saves) : '—'}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                      <MessageCircle size={10} />{formatK(post.comments)}
                    </span>
                  </div>
                  {post.engagementRate !== null && (
                    <div className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                      {formatPercent(post.engagementRate)} eng.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
