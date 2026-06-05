'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Users } from 'lucide-react'
import {
  useYouTubeChannelSummary,
  useYouTubeVideos,
  triggerYouTubeSync,
} from '@/hooks/useYouTubeData'
import { useSocialConnection } from '@/hooks/useSocialConnection'
import { IGTabErrorBoundary } from '@/components/instagram/pro/IGTabErrorBoundary'
import { YTNotConnected } from '@/components/youtube/pro/YTNotConnected'
import { YTChannelHeader } from '@/components/youtube/pro/YTChannelHeader'
import { YTTabNav, type YTTab } from '@/components/youtube/pro/YTTabNav'
import { YTOverviewStats } from '@/components/youtube/pro/YTOverviewStats'
import { YTTopVideos } from '@/components/youtube/pro/YTTopVideos'
import { YTInsightsPanel } from '@/components/youtube/pro/YTInsightsPanel'
import { YTVideoGrid } from '@/components/youtube/pro/YTVideoGrid'
import { YTGrowthChart } from '@/components/youtube/pro/YTGrowthChart'
import { YTMetricsGrid } from '@/components/youtube/pro/YTMetricsGrid'

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-48 rounded-2xl bg-muted" />
      <div className="h-10 rounded-lg bg-muted w-64" />
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

export function YTProPage() {
  const [tab, setTab] = useState<YTTab>('inicio')
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const { data: summary, loading, refresh } = useYouTubeChannelSummary()

  const connected = !!summary?.connected && !summary.channel?.needsReconnect

  const {
    videos,
    loading: videosLoading,
    hasMore,
    loadMore,
    loadingMore,
    refresh: refreshVideos,
  } = useYouTubeVideos({ enabled: connected })

  const { disconnect } = useSocialConnection('youtube', {
    onConnectSuccess: () => void refresh(),
  })

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const ok = await triggerYouTubeSync()
      if (ok) {
        await Promise.all([refresh(), refreshVideos()])
      }
    } finally {
      setSyncing(false)
    }
  }, [refresh, refreshVideos])

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true)
    try {
      await disconnect()
      await refresh()
    } catch {
      toast.error('Error al desconectar YouTube')
    } finally {
      setDisconnecting(false)
    }
  }, [disconnect, refresh])

  // Not connected
  if (!connected && !loading) {
    return <YTNotConnected />
  }

  // Initial load
  if (loading && !summary) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-5">
      {/* Channel header */}
      {summary && (
        <YTChannelHeader
          summary={summary}
          syncing={syncing || disconnecting}
          onSync={() => void handleSync()}
          onDisconnect={() => void handleDisconnect()}
        />
      )}

      {/* Tab navigation */}
      <YTTabNav active={tab} onChange={setTab} />

      {/* Tab content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {tab === 'inicio' && (
          <IGTabErrorBoundary tabName="Inicio">
            <div className="space-y-6">
              {summary && <YTOverviewStats summary={summary} videos={videos} />}
              <YTMetricsGrid videos={videos} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <YTTopVideos videos={videos} />
                <YTInsightsPanel videos={videos} />
              </div>
              <YTGrowthChart />
            </div>
          </IGTabErrorBoundary>
        )}

        {tab === 'videos' && (
          <IGTabErrorBoundary tabName="Videos">
            <YTVideoGrid
              videos={videos}
              loading={videosLoading}
              hasMore={hasMore}
              onLoadMore={() => void loadMore()}
              loadingMore={loadingMore}
            />
          </IGTabErrorBoundary>
        )}

        {tab === 'audiencia' && (
          <IGTabErrorBoundary tabName="Audiencia">
            <div className="rounded-2xl border border-border/60 bg-card p-10 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Demografía de audiencia próximamente
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Los datos demográficos de la audiencia (edad, género, geografía) requieren scopes
                  adicionales de la YouTube Analytics API que están pendientes de aprobación. Una vez
                  habilitados, aparecerán acá automáticamente.
                </p>
              </div>
            </div>
          </IGTabErrorBoundary>
        )}
      </div>
    </div>
  )
}
