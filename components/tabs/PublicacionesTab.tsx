'use client'

import { useMemo } from 'react'
import { Image, Heart, MessageCircle } from 'lucide-react'
import { formatK } from '@/lib/utils/formatters'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { userReelToView } from '@/lib/instagram/to-reel-view'

export function PublicacionesTab() {
  const { hasRealData, reels: realReels, hasLoaded } = useInstagramDataContext()

  const posts = useMemo(() => hasRealData ? realReels.map(userReelToView) : [], [hasRealData, realReels])

  if (hasLoaded && !hasRealData) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--muted)' }}>
          <Image size={20} style={{ color: 'var(--muted-foreground)' }} />
        </div>
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Sin publicaciones sincronizadas</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Conecta tu cuenta de Instagram y haz clic en Sincronizar para importar tus publicaciones.
          </p>
        </div>
      </div>
    )
  }

  const totalLikes = posts.reduce((s, p) => s + p.likes, 0)
  const totalComments = posts.reduce((s, p) => s + p.comments, 0)

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'PUBLICACIONES', value: posts.length.toString() },
          { label: 'TOTAL LIKES', value: formatK(totalLikes) },
          { label: 'TOTAL COMENTARIOS', value: formatK(totalComments) },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-xs tracking-wide uppercase mb-2" style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-4 gap-4">
        {posts.map(post => (
          <div key={post.id} className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="aspect-square flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: 'var(--muted)' }}>
              {post.thumbnail ? (
                <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <Image size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
              )}
            </div>
            <div className="p-3">
              <p className="text-[11px] line-clamp-2 mb-2" style={{ color: 'var(--foreground)' }}>{post.title}</p>
              <p className="text-[10px] mb-2" style={{ color: 'var(--muted-foreground)' }}>{post.publishedAt}</p>
              <div className="flex gap-3 text-[11px]">
                <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                  <Heart size={10} />{formatK(post.likes)}
                </span>
                <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                  <MessageCircle size={10} />{formatK(post.comments)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
