'use client'

import { useState, useMemo } from 'react'
import { REELS, getAvgViews } from '@/lib/mock-data/reels'
import { ReelCard } from '@/components/reels/ReelCard'
import { ReelFilters, type SortKey, type SortDir, type ReelType, type TrafficType } from '@/components/reels/ReelFilters'
import { ReelsSummaryPanel } from '@/components/reels/ReelsSummaryPanel'
import { ViewsScatterChart } from '@/components/reels/ViewsScatterChart'
import { RadarDiaSemana } from '@/components/reels/RadarDiaSemana'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { userReelToView } from '@/lib/instagram/to-reel-view'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'
import type { Reel } from '@/lib/types'

export function ReelsTab() {
  const [sort, setSort] = useState<SortKey>('fecha')
  const [dir, setDir] = useState<SortDir>('desc')
  const [type, setType] = useState<ReelType>('all')
  const [traffic, setTraffic] = useState<TrafficType>('all')

  const { hasRealData, reels: realReels, hasMore, loadingMore, loadMore } = useInstagramDataContext()

  const sourceReels: Reel[] = useMemo(
    () => (hasRealData ? realReels.map(userReelToView) : REELS),
    [hasRealData, realReels],
  )
  const avgViews = useMemo(() => {
    if (!hasRealData) return getAvgViews()
    if (sourceReels.length === 0) return 0
    return sourceReels.reduce((s, r) => s + r.views, 0) / sourceReels.length
  }, [hasRealData, sourceReels])

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

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Filters */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <ReelFilters
            sort={sort} dir={dir} type={type} traffic={traffic}
            onSort={setSort}
            onDir={() => setDir(d => d === 'desc' ? 'asc' : 'desc')}
            onType={setType}
            onTraffic={setTraffic}
          />
          {!hasRealData && <DemoDataPill />}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {filtered.map(reel => (
            <ReelCard key={reel.id} reel={reel} />
          ))}
        </div>

        {/* Load more — only when there is more real data to fetch */}
        {hasRealData && hasMore && (
          <div className="mb-6 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
              style={{
                backgroundColor: 'var(--card)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            >
              {loadingMore ? 'Cargando…' : 'Cargar más reels'}
            </button>
          </div>
        )}

        {/* Bottom charts */}
        <div className="grid grid-cols-2 gap-4">
          <ViewsScatterChart reels={filtered} avgViews={avgViews} />
          <RadarDiaSemana />
        </div>
      </div>

      {/* Sticky right panel */}
      <div className="w-64 flex-shrink-0">
        <div className="sticky top-20">
          <ReelsSummaryPanel reels={filtered} />
        </div>
      </div>
    </div>
  )
}
