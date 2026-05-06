'use client'

import dynamic from 'next/dynamic'
import { Settings } from 'lucide-react'
import { AdsTabNav, useAdsTab } from '@/components/ads/AdsTabNav'
import { TimeFilter } from '@/components/layout/TimeFilter'

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
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            Ads Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Rendimiento centralizado de Meta Ads y TikTok Ads.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeFilter />
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--muted-foreground)',
            }}
          >
            <Settings size={14} />
            Gestionar cuentas
          </button>
        </div>
      </div>

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
