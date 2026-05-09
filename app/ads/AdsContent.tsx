'use client'

import dynamic from 'next/dynamic'
import { Settings, Megaphone } from 'lucide-react'
import { AdsTabNav, useAdsTab } from '@/components/ads/AdsTabNav'
import { TimeFilter } from '@/components/layout/TimeFilter'
import { PageHeader } from '@/components/ui/PageHeader'

const AdsResumenTab = dynamic(
  () => import('@/components/ads/AdsResumenTab').then(m => m.AdsResumenTab),
  { ssr: false }
)
const AdsMetaTab = dynamic(
  () => import('@/components/ads/AdsMetaTab').then(m => m.AdsMetaTab),
  { ssr: false }
)
const AdsTikTokTab = dynamic(
  () => import('@/components/ads/AdsTikTokTab').then(m => m.AdsTikTokTab),
  { ssr: false }
)
const AdsCreativosTab = dynamic(
  () => import('@/components/ads/AdsCreativosTab').then(m => m.AdsCreativosTab),
  { ssr: false }
)

export function AdsContent() {
  const [tab] = useAdsTab()

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Performance"
        title="Ads Dashboard"
        description="Rendimiento centralizado de Meta Ads y TikTok Ads."
        icon={Megaphone}
        actions={
          <>
            <TimeFilter />
            <button className="btn btn-secondary">
              <Settings size={14} />
              Gestionar cuentas
            </button>
          </>
        }
      />

      {/* Tabs */}
      <div className="mb-6">
        <AdsTabNav />
      </div>

      {/* Content */}
      {tab === 'resumen'     && <AdsResumenTab />}
      {tab === 'meta-ads'    && <AdsMetaTab />}
      {tab === 'tiktok-ads'  && <AdsTikTokTab />}
      {tab === 'creativos'   && <AdsCreativosTab />}
    </div>
  )
}
