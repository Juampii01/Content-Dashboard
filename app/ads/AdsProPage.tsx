'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAdsAccountSummary, useAdCampaigns, triggerAdsSync } from '@/hooks/useAdsData'
import { useSocialConnection } from '@/hooks/useSocialConnection'
import { AdsNotConnected } from '@/components/ads/pro/AdsNotConnected'
import { AdsAccountHeader } from '@/components/ads/pro/AdsAccountHeader'
import { type AdsTab } from '@/components/ads/pro/AdsTabNav'

const AdsTabNav = dynamic(
  () => import('@/components/ads/pro/AdsTabNav').then((m) => m.AdsTabNav),
  { ssr: false },
)

const AdsOverviewStats = dynamic(
  () => import('@/components/ads/pro/AdsOverviewStats').then((m) => m.AdsOverviewStats),
  { ssr: false },
)

const AdsCampaignTable = dynamic(
  () => import('@/components/ads/pro/AdsCampaignTable').then((m) => m.AdsCampaignTable),
  { ssr: false },
)

const AdsPerformanceChart = dynamic(
  () => import('@/components/ads/pro/AdsPerformanceChart').then((m) => m.AdsPerformanceChart),
  { ssr: false },
)

const AdsInsightsPanel = dynamic(
  () => import('@/components/ads/pro/AdsInsightsPanel').then((m) => m.AdsInsightsPanel),
  { ssr: false },
)
const AdsMetricsGrid = dynamic(
  () => import('@/components/ads/pro/AdsMetricsGrid').then((m) => m.AdsMetricsGrid),
  { ssr: false },
)

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header skeleton */}
      <div
        className="rounded-2xl p-5 animate-pulse"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', height: 200 }}
      />
      {/* Tab nav skeleton */}
      <div
        className="h-12 rounded-xl animate-pulse"
        style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
      />
      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl animate-pulse"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', height: 96, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export function AdsProPage() {
  const [tab, setTab] = useState<AdsTab>('resumen')
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const { data: summary, loading, refresh } = useAdsAccountSummary()
  const connected = summary?.connected ?? false

  const { campaigns } = useAdCampaigns(connected)

  const { connect, disconnect } = useSocialConnection('meta-ads', {
    onConnectSuccess: () => void refresh(),
  })

  async function handleSync() {
    setSyncing(true)
    const ok = await triggerAdsSync()
    if (ok) await refresh()
    setSyncing(false)
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    await disconnect()
    await refresh()
    setDisconnecting(false)
  }

  // Initial loading state
  if (loading) {
    return <LoadingSkeleton />
  }

  // Not connected
  if (!connected) {
    return <AdsNotConnected onConnect={connect} />
  }

  return (
    <div className="space-y-5">
      {/* Account header with stats + actions */}
      {summary && (
        <AdsAccountHeader
          summary={summary}
          syncing={syncing}
          onSync={() => void handleSync()}
          onDisconnect={() => void handleDisconnect()}
        />
      )}

      {/* Tab navigation */}
      <AdsTabNav activeTab={tab} onChange={setTab} />

      {/* Tab content */}
      <div className="pt-1">
        {/* Resumen tab */}
        {tab === 'resumen' && (
          <div className="space-y-5">
            <AdsOverviewStats stats={summary?.stats ?? null} />
            <AdsMetricsGrid campaigns={campaigns} />
            <AdsPerformanceChart />
            <AdsInsightsPanel campaigns={campaigns} />
          </div>
        )}

        {/* Campañas tab */}
        {tab === 'campañas' && (
          <AdsCampaignTable connected={connected} />
        )}

        {/* Rendimiento tab */}
        {tab === 'rendimiento' && (
          <div className="space-y-6">
            <AdsPerformanceChart fullWidth />

            {/* Top 5 campaigns breakdown */}
            {campaigns.length > 0 && (
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Top 5 campañas por gasto
                </p>
                <div className="space-y-3">
                  {campaigns.slice(0, 5).map((c) => {
                    const maxSpend = campaigns[0]?.spend ?? 1
                    const pct = maxSpend > 0 ? (c.spend / maxSpend) * 100 : 0
                    return (
                      <div key={c.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className="truncate max-w-[220px] font-medium"
                            style={{ color: 'var(--foreground)' }}
                            title={c.name}
                          >
                            {c.name || '(Sin nombre)'}
                          </span>
                          <span className="tabular-nums font-semibold ml-2 flex-shrink-0" style={{ color: 'var(--foreground)' }}>
                            ${c.spend.toFixed(2)}
                          </span>
                        </div>
                        <div
                          className="w-full h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--muted)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #1877F2 0%, #0866FF 100%)' }}
                          />
                        </div>
                        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                          <span>CTR: {c.ctr.toFixed(2)}%</span>
                          <span>ROAS: {c.roas > 0 ? `${c.roas.toFixed(2)}x` : '—'}</span>
                          <span>Conv: {c.conversions > 0 ? c.conversions : '—'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Disconnecting overlay */}
      {disconnecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div
            className="rounded-xl px-6 py-4 text-sm font-medium"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            Desconectando Meta Ads…
          </div>
        </div>
      )}
    </div>
  )
}
