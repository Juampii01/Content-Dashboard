'use client'

import type { ReelDTO } from '@/lib/types/competidores'
import { ReelCard } from '@/components/competidores/ReelCard'
import { Film } from 'lucide-react'

interface ReelGridProps {
  reels: ReelDTO[]
  onOpenDrawer: (reelId: string) => void
}

export function ReelGrid({ reels, onOpenDrawer }: ReelGridProps) {
  if (reels.length === 0) {
    return (
      <div
        className="rounded-2xl p-16 flex flex-col items-center gap-3 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px dashed var(--border)' }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--muted)' }}
        >
          <Film size={20} style={{ color: 'var(--muted-foreground)' }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Sin reels todavía
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Usá &ldquo;Refrescar&rdquo; para sincronizar los reels de este competidor.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {reels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} onOpenDrawer={onOpenDrawer} />
      ))}
    </div>
  )
}
