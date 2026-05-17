'use client'

import { Suspense, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, RefreshCw, Megaphone } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConnectButton } from '@/components/shared/ConnectButton'
import { useAdsAccountSummary, triggerAdsSync } from '@/hooks/useAdsData'
import { AdsTabNav, useAdsTab } from './AdsTabNav'

const AdsDashboardTab = dynamic(
  () => import('./AdsDashboardTab').then((m) => m.AdsDashboardTab),
  { ssr: false },
)
const AdsCampaignsTab = dynamic(
  () => import('./AdsCampaignsTab').then((m) => m.AdsCampaignsTab),
  { ssr: false },
)

export function AdsContent() {
  const [tab] = useAdsTab()
  const { data: summary, loading, refresh } = useAdsAccountSummary()
  const [syncing, setSyncing] = useState(false)

  const connected = summary?.connected ?? false
  const tokenExpired = summary?.tokenExpired ?? false
  const hasData = connected && (summary?.campaignsCount ?? 0) > 0

  async function handleSync() {
    setSyncing(true)
    const ok = await triggerAdsSync()
    if (ok) await refresh()
    setSyncing(false)
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Performance"
        title="Ads Dashboard"
        description="Rendimiento de campañas de Meta Ads."
        icon={Megaphone}
        actions={
          <>
            {connected && (
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="btn btn-secondary"
              >
                {syncing
                  ? <Loader2 size={14} className="animate-spin" />
                  : <RefreshCw size={14} />}
                {syncing ? 'Sincronizando…' : 'Sincronizar'}
              </button>
            )}
            <Suspense fallback={null}>
              <ConnectButton
                platform="meta-ads"
                labels={{ disconnected: 'Conectar Meta Ads', connected: 'Meta Ads conectado' }}
              />
            </Suspense>
          </>
        }
      />

      {/* Tabs */}
      <div className="mb-6">
        <AdsTabNav />
      </div>

      {/* Not-connected banner */}
      {!loading && !connected && (
        <div
          className="rounded-xl p-5 mb-5 flex items-center gap-4"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--platform-meta) 9%, transparent)',
              border: '1px solid color-mix(in srgb, var(--platform-meta) 20%, transparent)',
            }}
          >
            <Megaphone size={18} style={{ color: 'var(--platform-meta)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Conecta tu cuenta de Meta Ads
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Necesitamos acceso OAuth con permiso <code>ads_read</code> para sincronizar campañas e insights.
            </p>
          </div>
        </div>
      )}

      {/* Token-expired banner */}
      {!loading && tokenExpired && (
        <div
          className="rounded-xl p-5 mb-5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)',
            border: '1px solid var(--destructive)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--destructive)' }}>
            Tu conexión con Meta Ads expiró.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Reconecta la cuenta para volver a sincronizar campañas.
          </p>
        </div>
      )}

      {/* Content */}
      {tab === 'overview'   && <AdsDashboardTab  connected={connected} hasData={hasData} />}
      {tab === 'campaigns'  && <AdsCampaignsTab  connected={connected} hasData={hasData} />}
    </div>
  )
}
