'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Music } from 'lucide-react'
import { TimeFilter } from '@/components/layout/TimeFilter'
import { TikTokTabNav, useTikTokTab } from '@/components/tiktok/TikTokTabNav'
import { ConnectButton } from '@/components/shared/ConnectButton'
import { PageHeader } from '@/components/ui/PageHeader'

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
    <div className="page-shell">
      <PageHeader
        eyebrow="Redes sociales"
        title="TikTok Analytics"
        description="Análisis de rendimiento y crecimiento en TikTok."
        icon={Music}
        actions={
          <>
            <TimeFilter />
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

      {/* Content */}
      {tab === 'dashboard'  && <TikTokDashboardTab />}
      {tab === 'videos'     && <TikTokVideosTab />}
      {tab === 'tendencias' && <TikTokTendenciasTab />}
      {tab === 'audiencia'  && <TikTokAudienciaTab />}
    </div>
  )
}
