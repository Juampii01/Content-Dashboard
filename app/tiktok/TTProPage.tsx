'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'
import {
  useTikTokChannelSummary,
  useTikTokVideos,
  triggerTikTokSync,
} from '@/hooks/useTikTokData'
import { useSocialConnection } from '@/hooks/useSocialConnection'
import { TTNotConnected } from '@/components/tiktok/pro/TTNotConnected'
import { TTProfileHeader } from '@/components/tiktok/pro/TTProfileHeader'
import { TTTabNav, type TTTab } from '@/components/tiktok/pro/TTTabNav'
import { TTOverviewStats } from '@/components/tiktok/pro/TTOverviewStats'
import { TTTopVideos } from '@/components/tiktok/pro/TTTopVideos'
import { TTInsightsPanel } from '@/components/tiktok/pro/TTInsightsPanel'
import { TTMetricsGrid } from '@/components/tiktok/pro/TTMetricsGrid'
import { TTVideoGrid } from '@/components/tiktok/pro/TTVideoGrid'
import { TT_TEAL, TT_PINK } from '@/components/tiktok/pro/tt-theme'

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 rounded-2xl bg-muted" />
      <div className="h-10 rounded-lg bg-muted w-64" />
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

export function TTProPage() {
  const [tab, setTab] = useState<TTTab>('inicio')
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const { data: summary, loading: summaryLoading, refresh: refreshSummary } = useTikTokChannelSummary()

  const connected = summary?.connected ?? false
  const tokenExpired = summary?.tokenExpired ?? false

  const {
    videos,
    loading: videosLoading,
    loadingMore,
    hasMore,
    loadMore,
    refresh: refreshVideos,
  } = useTikTokVideos({ enabled: connected && !tokenExpired })

  const { connect, disconnect } = useSocialConnection('tiktok', {
    onConnectSuccess: () => {
      void refreshSummary()
      void refreshVideos()
    },
  })

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const ok = await triggerTikTokSync()
      if (ok) {
        await Promise.all([refreshSummary(), refreshVideos()])
      }
    } finally {
      setSyncing(false)
    }
  }, [refreshSummary, refreshVideos])

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true)
    try {
      await disconnect()
      await refreshSummary()
    } catch {
      toast.error('Error al desconectar TikTok')
    } finally {
      setDisconnecting(false)
    }
  }, [disconnect, refreshSummary])

  // Initial load
  if (summaryLoading) {
    return <PageSkeleton />
  }

  // Not connected or token expired
  if (!connected || tokenExpired) {
    return (
      <div>
        {tokenExpired && (
          <div
            className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
            style={{ borderColor: `${TT_PINK}50`, background: `${TT_PINK}10`, color: TT_PINK }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Tu token de TikTok ha expirado. Vuelve a conectar tu cuenta para continuar.
            </span>
          </div>
        )}
        <TTNotConnected onConnect={connect} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Profile header */}
      {summary && (
        <TTProfileHeader
          summary={summary}
          syncing={syncing || disconnecting}
          onSync={() => void handleSync()}
          onDisconnect={() => void handleDisconnect()}
        />
      )}

      {/* Tab navigation */}
      <TTTabNav active={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === 'inicio' && (
        <div className="space-y-6">
          {summary && <TTOverviewStats summary={summary} />}
          {!videosLoading && videos.length > 0 && <TTMetricsGrid videos={videos} />}
          {!videosLoading && videos.length > 0 && <TTTopVideos videos={videos} />}
          {videosLoading && (
            <div className="h-64 rounded-xl bg-muted animate-pulse" />
          )}
          {!videosLoading && <TTInsightsPanel videos={videos} />}
        </div>
      )}

      {tab === 'videos' && (
        <TTVideoGrid
          videos={videos}
          loading={videosLoading}
          hasMore={hasMore}
          onLoadMore={() => void loadMore()}
        />
      )}

      {tab === 'publicar' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: `linear-gradient(135deg, ${TT_TEAL}30, ${TT_PINK}30)` }}
          >
            <span className="text-2xl">🎬</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Publicación directa desde TikTok próximamente
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Pronto podrás programar y publicar videos directamente desde el dashboard.
          </p>
        </div>
      )}

      {/* Loading more indicator */}
      {tab === 'videos' && loadingMore && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 rounded-full border-2 border-muted border-t-foreground animate-spin" />
        </div>
      )}
    </div>
  )
}
