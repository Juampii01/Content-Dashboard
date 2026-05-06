'use client'

import type { ReelDTO } from '@/lib/types/competidores'
import { ReelCard } from '@/components/competidores/ReelCard'

interface ReelGridProps {
  reels: ReelDTO[]
  onOpenDrawer: (reelId: string) => void
}

export function ReelGrid({ reels, onOpenDrawer }: ReelGridProps) {
  if (reels.length === 0) {
    return (
      <div
        className="rounded-2xl p-12 text-center"
        style={{ backgroundColor: 'var(--card)', border: '1px dashed var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          No hay reels disponibles para este competidor.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {reels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} onOpenDrawer={onOpenDrawer} />
      ))}
    </div>
  )
}
