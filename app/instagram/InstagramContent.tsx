'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { useTab } from '@/hooks/useTab'
import { TabNav } from '@/components/layout/TabNav'
import { TimeFilter } from '@/components/layout/TimeFilter'
import { useInstagramData } from '@/hooks/useInstagramData'
import { InstagramSyncBanner } from '@/components/instagram/InstagramSyncBanner'
import { InstagramDataProvider, type InstagramDataContextValue } from '@/components/instagram/InstagramDataContext'

const DashboardTab     = dynamic(() => import('@/components/tabs/DashboardTab').then((m) => m.DashboardTab),         { ssr: false })
const ReelsTab         = dynamic(() => import('@/components/tabs/ReelsTab').then((m) => m.ReelsTab),                 { ssr: false })
const HistoriasTab     = dynamic(() => import('@/components/tabs/HistoriasTab').then((m) => m.HistoriasTab),         { ssr: false })
const PublicacionesTab = dynamic(() => import('@/components/tabs/PublicacionesTab').then((m) => m.PublicacionesTab), { ssr: false })
const CompetenciaTab   = dynamic(() => import('@/components/tabs/CompetenciaTab').then((m) => m.CompetenciaTab),     { ssr: false })
const ReferenciasTab   = dynamic(() => import('@/components/tabs/ReferenciasTab').then((m) => m.ReferenciasTab),     { ssr: false })
const DemografiaTab    = dynamic(() => import('@/components/tabs/DemografiaTab').then((m) => m.DemografiaTab),       { ssr: false })

export function InstagramContent() {
  const [tab] = useTab()
  const { summary, reels, loading, syncing, sync } = useInstagramData()

  const ctxValue: InstagramDataContextValue = useMemo(
    () => ({
      connected: !!summary?.connected && !summary.tokenExpired,
      hasRealData: (summary?.connected ?? false) && !summary?.tokenExpired && reels.length > 0,
      summary,
      reels,
      loading,
    }),
    [summary, reels, loading],
  )

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            IG Intelligence
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Análisis profundo de tu cuenta de Instagram.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeFilter />
        </div>
      </div>

      {/* Connection / sync banner */}
      <InstagramSyncBanner
        summary={summary}
        loading={loading}
        syncing={syncing}
        onSync={() => void sync()}
        reelCount={reels.length}
      />

      {/* Tab navigation */}
      <div className="mb-6">
        <TabNav />
      </div>

      {/* Tab content */}
      <InstagramDataProvider value={ctxValue}>
        {tab === 'dashboard'     && <DashboardTab />}
        {tab === 'reels'         && <ReelsTab />}
        {tab === 'historias'     && <HistoriasTab />}
        {tab === 'publicaciones' && <PublicacionesTab />}
        {tab === 'competencia'   && <CompetenciaTab />}
        {tab === 'referencias'   && <ReferenciasTab />}
        {tab === 'demografia'    && <DemografiaTab />}
      </InstagramDataProvider>
    </div>
  )
}
