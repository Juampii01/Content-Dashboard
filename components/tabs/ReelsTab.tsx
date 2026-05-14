'use client'

import { useState, useMemo } from 'react'
import { Clapperboard } from 'lucide-react'
import { ReelCard } from '@/components/reels/ReelCard'
import { ReelFilters, type SortKey, type SortDir, type ReelType, type TrafficType } from '@/components/reels/ReelFilters'
import { ReelsSummaryPanel } from '@/components/reels/ReelsSummaryPanel'
import { ViewsScatterChart } from '@/components/reels/ViewsScatterChart'
import { RadarDiaSemana } from '@/components/reels/RadarDiaSemana'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { userReelToView } from '@/lib/instagram/to-reel-view'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Reel } from '@/lib/types'

export function ReelsTab() {
  const [sort, setSort] = useState<SortKey>('fecha')
  const [dir, setDir] = useState<SortDir>('desc')
  const [type, setType] = useState<ReelType>('all')
  const [traffic, setTraffic] = useState<TrafficType>('all')

  const { hasRealData, reels: realReels } = useInstagramDataContext()

  const sourceReels: Reel[] = useMemo(
    () => (hasRealData ? realReels.map(userReelToView) : []),
    [hasRealData, realReels],
  )

  const avgViews = useMemo(() => {
    if (sourceReels.length === 0) return 0
    return sourceReels.reduce((s, r) => s + r.views, 0) / sourceReels.length
  }, [sourceReels])

  const filtered = useMemo(() => {
    let list: Reel[] = [...sourceReels]
    if (type === 'reel') list = list.filter(r => !r.isTrialReel)
    if (type === 'trial') list = list.filter(r => r.isTrialReel)
    if (traffic === 'organic') list = list.filter(r => !r.isAd)
    if (traffic === 'paid') list = list.filter(r => r.isAd)
    const sortMap: Record<SortKey, (r: Reel) => number> = {
      fecha: r => new Date(r.publishedAt).getTime(),
      views: r => r.views,
      viewsOrg: r => r.viewsOrganic,
      likes: r => r.likes,
      saves: r => r.saves,
      comments: r => r.comments,
      shares: r => r.shares,
      multiplier: r => r.multiplier,
    }
    list.sort((a, b) => {
      const diff = sortMap[sort](b) - sortMap[sort](a)
      return dir === 'desc' ? diff : -diff
    })
    return list
  }, [sort, dir, type, traffic, sourceReels])

  if (!hasRealData) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="Sin reels sincronizados"
        description="Conectá tu cuenta de Instagram y sincronizá para ver tus reels y métricas reales."
      />
    )
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <ReelFilters
            sort={sort} dir={dir} type={type} traffic={traffic}
            onSort={setSort}
            onDir={() => setDir(d => d === 'desc' ? 'asc' : 'desc')}
            onType={setType}
            onTraffic={setTraffic}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Clapperboard}
            title="Sin resultados"
            description="No hay reels que coincidan con los filtros seleccionados."
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {filtered.map(reel => (
                <ReelCard key={reel.id} reel={reel} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ViewsScatterChart reels={filtered} avgViews={avgViews} />
              <RadarDiaSemana />
            </div>
          </>
        )}
      </div>
      <div className="w-64 flex-shrink-0">
        <div className="sticky top-20">
          <ReelsSummaryPanel reels={filtered} />
        </div>
      </div>
    </div>
  )
}
