'use client'

import { LayoutDashboard, Heart, MessageCircle, Users, Trophy, Clapperboard } from 'lucide-react'
import Link from 'next/link'
import { formatK } from '@/lib/utils/formatters'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { userReelToView } from '@/lib/instagram/to-reel-view'

export function DashboardTab() {
  const { hasRealData, reels: realReels, summary, hasLoaded } = useInstagramDataContext()

  if (hasLoaded && !hasRealData) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--muted)' }}>
          <LayoutDashboard size={20} style={{ color: 'var(--muted-foreground)' }} />
        </div>
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Sin datos sincronizados</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Conecta tu cuenta de Instagram y haz clic en Sincronizar para ver métricas reales.
          </p>
        </div>
      </div>
    )
  }

  const reels = realReels.map(userReelToView)
  const totalLikes = reels.reduce((s, r) => s + r.likes, 0)
  const totalComments = reels.reduce((s, r) => s + r.comments, 0)
  const followers = summary?.latestSnapshot?.followers ?? null
  const bestReel = [...reels].sort((a, b) => b.likes - a.likes)[0] ?? null

  return (
    <div className="space-y-5">
      {/* Row 1: Seguidores + Interacciones + Mejor Reel */}
      <div className="grid grid-cols-3 gap-4">
        {/* Seguidores */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>SEGUIDORES</p>
            <Users size={16} style={{ color: 'var(--stat-icon)' }} />
          </div>
          <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
            {followers !== null ? formatK(followers) : '—'}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            {summary?.accountName ? `@${summary.accountName}` : 'Último snapshot'}
          </p>
        </div>

        {/* Interacciones */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>INTERACCIONES</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                <Heart className="h-3 w-3" /> ME GUSTA
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(totalLikes)}</p>
            </div>
            <div>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                <MessageCircle className="h-3 w-3" /> COMENTARIOS
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(totalComments)}</p>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--muted-foreground)' }}>Total acumulado · {reels.length} reels</p>
        </div>

        {/* Mejor Reel */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>MEJOR REEL</p>
            <Trophy size={16} style={{ color: 'var(--stat-icon)' }} />
          </div>
          {bestReel ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                  <Clapperboard size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(bestReel.likes)}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>me gusta</p>
                  <Link href={`/instagram/reels/${bestReel.id}`}
                    className="text-xs mt-1 inline-block hover:underline" style={{ color: 'var(--accent)' }}>
                    Ver reel →
                  </Link>
                </div>
              </div>
              <p className="text-xs mt-2 truncate" style={{ color: 'var(--muted-foreground)' }}>
                1° de {reels.length} reels
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Sin datos</p>
          )}
        </div>
      </div>
    </div>
  )
}
