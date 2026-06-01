'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useInstagramData } from '@/hooks/useInstagramData'
import { useSocialConnection } from '@/hooks/useSocialConnection'
import { InstagramDataProvider } from '@/components/instagram/InstagramDataContext'
import { IGProfileHeader } from '@/components/instagram/pro/IGProfileHeader'
import { IGStoriesReel } from '@/components/instagram/pro/IGStoriesReel'
import { IGTabNav, type IGTab } from '@/components/instagram/pro/IGTabNav'
import { IGNotConnected } from '@/components/instagram/pro/IGNotConnected'
import { IGOverviewStats } from '@/components/instagram/pro/IGOverviewStats'
import { IGTopContent } from '@/components/instagram/pro/IGTopContent'
import { IGInsightsPanel } from '@/components/instagram/pro/IGInsightsPanel'
import { IGContentGrid } from '@/components/instagram/pro/IGContentGrid'
import { IGAudiencePanel } from '@/components/instagram/pro/IGAudiencePanel'
import { IGInbox } from '@/components/instagram/pro/IGInbox'
import { IGPublishPanel } from '@/components/instagram/pro/IGPublishPanel'

export function IGProPage() {
  const { summary, reels, loading, syncing, sync, refresh } = useInstagramData()
  const { disconnect } = useSocialConnection('instagram', { onConnectSuccess: () => void refresh() })
  const [tab, setTab] = useState<IGTab>('inicio')
  const [disconnecting, setDisconnecting] = useState(false)

  const connected = !!summary?.connected && !summary.tokenExpired

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await disconnect()
      await refresh()
    } catch (err) {
      console.error('[instagram] disconnect failed:', err)
      toast.error('Error al desconectar. Intentá de nuevo.')
      await refresh().catch(() => {})
    } finally {
      setDisconnecting(false)
    }
  }

  // Not connected
  if (!loading && (!summary || !connected)) {
    return <IGNotConnected />
  }

  // Loading skeleton
  if (loading && !summary) {
    return (
      <div className="animate-pulse border-b border-[var(--border)] px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center gap-8">
          <div className="w-28 h-28 rounded-full bg-[var(--muted)]" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-32 bg-[var(--muted)] rounded-full" />
            <div className="h-4 w-56 bg-[var(--muted)] rounded-full" />
            <div className="h-3 w-44 bg-[var(--muted)] rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  const ctxValue = useMemo(
    () => ({
      connected,
      hasRealData: connected && reels.length > 0,
      summary,
      reels,
      loading,
      hasLoaded: !loading,
    }),
    [connected, reels, loading, summary],
  )

  return (
    <InstagramDataProvider value={ctxValue}>
    <div className="min-h-screen bg-[var(--background)]">
      {/* Profile header — looks like visiting your own IG profile */}
      {summary && (
        <IGProfileHeader
          summary={summary}
          syncing={syncing || disconnecting}
          onSync={() => void sync()}
          onDisconnect={() => void handleDisconnect()}
        />
      )}

      {/* Top content story circles */}
      {reels.length > 0 && <IGStoriesReel reels={reels} />}

      {/* Instagram-style tab navigation */}
      <IGTabNav active={tab} onChange={setTab} />

      {/* Tab panels */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {tab === 'inicio' && summary && (
          <div className="space-y-5">
            <IGOverviewStats summary={summary} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <IGTopContent reels={reels} />
              <IGInsightsPanel reels={reels} />
            </div>
          </div>
        )}

        {tab === 'contenido' && (
          <IGContentGrid reels={reels} loading={loading} />
        )}

        {tab === 'audiencia' && <IGAudiencePanel />}

        {tab === 'mensajes' && <IGInbox />}

        {tab === 'publicar' && <IGPublishPanel />}
      </div>
    </div>
    </InstagramDataProvider>
  )
}
