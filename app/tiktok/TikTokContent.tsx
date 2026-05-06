'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { TimeFilter } from '@/components/layout/TimeFilter'
import { TikTokTabNav, useTikTokTab } from '@/components/tiktok/TikTokTabNav'
import { ConnectButton } from '@/components/shared/ConnectButton'

const TikTokDashboardTab = dynamic(
  () => import('@/components/tiktok/TikTokDashboardTab').then(m => m.TikTokDashboardTab),
  { ssr: false }
)
const TikTokVideosTab = dynamic(
  () => import('@/components/tiktok/TikTokVideosTab').then(m => m.TikTokVideosTab),
  { ssr: false }
)
const TikTokTendenciasTab = dynamic(
  () => import('@/components/tiktok/TikTokTendenciasTab').then(m => m.TikTokTendenciasTab),
  { ssr: false }
)
const TikTokAudienciaTab = dynamic(
  () => import('@/components/tiktok/TikTokAudienciaTab').then(m => m.TikTokAudienciaTab),
  { ssr: false }
)

export function TikTokContent() {
  const [tab] = useTikTokTab()

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            TikTok Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Análisis de rendimiento y crecimiento en TikTok.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeFilter />
          <Suspense fallback={null}>
            <ConnectButton platform="tiktok" labels={{ connected: 'TikTok conectado' }} />
          </Suspense>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <TikTokTabNav />
      </div>

      {/* Content */}
      {tab === 'dashboard'  && <TikTokDashboardTab />}
      {tab === 'videos'     && <TikTokVideosTab />}
      {tab === 'tendencias' && <TikTokTendenciasTab />}
      {tab === 'audiencia'  && <TikTokAudienciaTab />}
    </div>
  )
}
