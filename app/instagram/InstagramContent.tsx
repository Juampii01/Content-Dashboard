'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { Camera } from 'lucide-react'
import { useTab } from '@/hooks/useTab'
import { TabNav } from '@/components/layout/TabNav'
import { TimeFilter } from '@/components/layout/TimeFilter'
import { useInstagramData } from '@/hooks/useInstagramData'
import { InstagramSyncBanner } from '@/components/instagram/InstagramSyncBanner'
import { InstagramDataProvider, type InstagramDataContextValue } from '@/components/instagram/InstagramDataContext'
import { PageHeader } from '@/components/ui/PageHeader'

const DashboardTab     = dynamic(() => import('@/components/tabs/DashboardTab').then((m) => m.DashboardTab),         { ssr: false })
const ReelsTab         = dynamic(() => import('@/components/tabs/ReelsTab').then((m) => m.ReelsTab),                 { ssr: false })
const HistoriasTab     = dynamic(() => import('@/components/tabs/HistoriasTab').then((m) => m.HistoriasTab),         { ssr: false })
const PublicacionesTab = dynamic(() => import('@/components/tabs/PublicacionesTab').then((m) => m.PublicacionesTab), { ssr: false })
const CompetenciaTab   = dynamic(() => import('@/components/tabs/CompetenciaTab').then((m) => m.CompetenciaTab),     { ssr: false })
const ReferenciasTab   = dynamic(() => import('@/components/tabs/ReferenciasTab').then((m) => m.ReferenciasTab),     { ssr: false })
const DemografiaTab    = dynamic(() => import('@/components/tabs/DemografiaTab').then((m) => m.DemografiaTab),       { ssr: false })
const VideoFeedView    = dynamic(() => import('@/components/video-feed/VideoFeedView').then((m) => m.VideoFeedView), { ssr: false })

export function InstagramContent() {
  const [tab] = useTab()
  const { summary, reels, loading, syncing, sync, hasMore, loadingMore, loadMore } = useInstagramData()

  const ctxValue: InstagramDataContextValue = useMemo(
    () => ({
      connected: !!summary?.connected && !summary.tokenExpired,
      hasRealData: (summary?.connected ?? false) && !summary?.tokenExpired && reels.length > 0,
      summary,
      reels,
      loading,
      hasMore,
      loadingMore,
      loadMore: () => void loadMore(),
    }),
    [summary, reels, loading, hasMore, loadingMore, loadMore],
  )

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Redes sociales"
        title="IG Intelligence"
        description="Análisis profundo de tu cuenta de Instagram."
        icon={Camera}
        actions={<TimeFilter />}
      />

      {/* Connection / sync banner */}
      <InstagramSyncBanner
        summary={summary}
        loading={loading}
        syncing={syncing}
        onSync={() => void sync()}
        reelCount={summary?.reelCount ?? reels.length}
        loadedReels={reels.length}
      />

      {/* Tab navigation */}
      <div className="mb-6">
        <TabNav />
      </div>

      {/* Tab content */}
      <InstagramDataProvider value={ctxValue}>
        {tab === 'dashboard'     && <DashboardTab />}
        {tab === 'reels'         && <ReelsTab />}
        {tab === 'top30d'        && <VideoFeedView />}
        {tab === 'historias'     && <HistoriasTab />}
        {tab === 'publicaciones' && <PublicacionesTab />}
        {tab === 'competencia'   && <CompetenciaTab />}
        {tab === 'referencias'   && <ReferenciasTab />}
        {tab === 'demografia'    && <DemografiaTab />}
      </InstagramDataProvider>
    </div>
  )
}
