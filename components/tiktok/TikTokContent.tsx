'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import { Loader2, RefreshCw, Music } from 'lucide-react'
import { TimeFilter } from '@/components/layout/TimeFilter'
import { TikTokTabNav, useTikTokTab } from './TikTokTabNav'
import { ConnectButton } from '@/components/shared/ConnectButton'
import { useTikTokChannelSummary, useTikTokVideos, triggerTikTokSync } from '@/hooks/useTikTokData'
import { PageHeader } from '@/components/ui/PageHeader'

const TikTokDashboardTab = dynamic(
  () => import('./TikTokDashboardTab').then((m) => m.TikTokDashboardTab),
  { ssr: false },
)
const TikTokVideosTab = dynamic(
  () => import('./TikTokVideosTab').then((m) => m.TikTokVideosTab),
  { ssr: false },
)

export function TikTokContent() {
  const [tab] = useTikTokTab()
  const { data: summary, loading, refresh: refreshSummary } = useTikTokChannelSummary()
  const [syncing, setSyncing] = useState(false)

  const connected = summary?.connected ?? false
  const tokenExpired = summary?.tokenExpired ?? false
  const videosCount = summary?.videosCount ?? 0
  const hasData = connected && videosCount > 0

  const {
    videos,
    loading: videosLoading,
    loadingMore,
    hasMore,
    loadMore,
    refresh: refreshVideos,
  } = useTikTokVideos({ enabled: connected, pageSize: 25 })

  async function handleSync() {
    setSyncing(true)
    const ok = await triggerTikTokSync()
    if (ok) {
      await Promise.all([refreshSummary(), refreshVideos()])
    }
    setSyncing(false)
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Redes sociales"
        title="TikTok Analytics"
        description="Análisis de rendimiento y crecimiento en TikTok."
        icon={Music}
        actions={
          <>
            {hasData && <TimeFilter />}
            {connected && (
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="btn btn-secondary"
              >
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {syncing ? 'Sincronizando...' : hasData ? 'Sincronizar' : 'Sincronizar ahora'}
              </button>
            )}
            <Suspense fallback={null}>
              <ConnectButton platform="tiktok" labels={{ connected: 'TikTok conectado' }} />
            </Suspense>
          </>
        }
      />

      {/* Tabs */}
      <div className="mb-6">
        <TikTokTabNav />
      </div>

      {/* Connection state banners */}
      {!loading && !connected && (
        <div
          className="rounded-xl p-5 mb-5 flex items-center gap-4"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--platform-tiktok) 9%, transparent)',
              border: '1px solid color-mix(in srgb, var(--platform-tiktok) 19%, transparent)',
            }}
          >
            <Music size={18} style={{ color: 'var(--platform-tiktok)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Conecta tu cuenta de TikTok
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Necesitamos acceso OAuth para poder sincronizar métricas y videos de tu cuenta.
            </p>
          </div>
        </div>
      )}

      {!loading && tokenExpired && (
        <div
          className="rounded-xl p-5 mb-5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)',
            border: '1px solid var(--destructive)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--destructive)' }}>
            Tu conexión con TikTok expiró.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Reconecta la cuenta para volver a sincronizar métricas.
          </p>
        </div>
      )}

      {/* Content */}
      {tab === 'dashboard' && <TikTokDashboardTab connected={connected} hasData={hasData} />}
      {tab === 'videos'    && (
        <TikTokVideosTab
          connected={connected}
          hasData={hasData}
          videos={videos}
          loading={videosLoading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          loadMore={loadMore}
        />
      )}
    </div>
  )
}
