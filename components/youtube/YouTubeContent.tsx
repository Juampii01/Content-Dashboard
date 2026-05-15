'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import { Loader2, RefreshCw, Play } from 'lucide-react'
import { TimeFilter } from '@/components/layout/TimeFilter'
import { YouTubeTabNav, useYouTubeTab } from './YouTubeTabNav'
import { ConnectButton } from '@/components/shared/ConnectButton'
import { useYouTubeChannelSummary, triggerYouTubeSync } from '@/hooks/useYouTubeData'
import { PageHeader } from '@/components/ui/PageHeader'

const YouTubeDashboardTab = dynamic(
  () => import('./YouTubeDashboardTab').then((m) => m.YouTubeDashboardTab),
  { ssr: false }
)
const YouTubeVideosTab = dynamic(
  () => import('./YouTubeVideosTab').then((m) => m.YouTubeVideosTab),
  { ssr: false }
)
const YouTubeAudienciaTab = dynamic(
  () => import('./YouTubeAudienciaTab').then((m) => m.YouTubeAudienciaTab),
  { ssr: false }
)

export function YouTubeContent() {
  const [tab] = useYouTubeTab()
  const { data: summary, loading, refresh } = useYouTubeChannelSummary()
  const [syncing, setSyncing] = useState(false)

  const connected = summary?.connected ?? false
  const needsReconnect = summary?.channel?.needsReconnect ?? false
  const videosCount = summary?.videosCount ?? 0
  const hasData = connected && videosCount > 0

  async function handleSync() {
    setSyncing(true)
    const ok = await triggerYouTubeSync()
    if (ok) await refresh()
    setSyncing(false)
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Redes sociales"
        title="YouTube Analytics"
        description="Análisis de rendimiento y crecimiento en YouTube."
        icon={Play}
        actions={
          <>
            <TimeFilter />
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
              <ConnectButton platform="youtube" labels={{ connected: 'YouTube conectado' }} />
            </Suspense>
          </>
        }
      />
      {/* Tabs */}
      <div className="mb-6">
        <YouTubeTabNav />
      </div>

      {/* Connection state banners */}
      {!loading && !connected && (
        <div
          className="rounded-xl p-5 mb-5 flex items-center gap-4"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'color-mix(in srgb, var(--platform-youtube) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--platform-youtube) 19%, transparent)' }}
          >
            <Play size={18} style={{ color: 'var(--platform-youtube)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Conecta tu canal de YouTube
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Necesitamos acceso OAuth para poder sincronizar métricas y videos de tu canal.
            </p>
          </div>
        </div>
      )}

      {!loading && needsReconnect && (
        <div
          className="rounded-xl p-5 mb-5"
          style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)', border: '1px solid var(--destructive)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--destructive)' }}>
            Tu conexión con YouTube expiró.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Reconecta la cuenta para volver a sincronizar métricas.
          </p>
        </div>
      )}

      {/* Content */}
      {tab === 'dashboard' && <YouTubeDashboardTab connected={connected} hasData={hasData} />}
      {tab === 'videos'    && <YouTubeVideosTab    connected={connected} hasData={hasData} />}
      {tab === 'audiencia' && <YouTubeAudienciaTab />}
    </div>
  )
}
