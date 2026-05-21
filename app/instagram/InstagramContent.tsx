'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { Camera, RefreshCw, Loader2, LogOut } from 'lucide-react'
import { useTab } from '@/hooks/useTab'
import { TabNav } from '@/components/layout/TabNav'
import { TimeFilter } from '@/components/layout/TimeFilter'
import { useInstagramData } from '@/hooks/useInstagramData'
import { InstagramSyncBanner } from '@/components/instagram/InstagramSyncBanner'
import { InstagramDataProvider, type InstagramDataContextValue } from '@/components/instagram/InstagramDataContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { useSocialConnection } from '@/hooks/useSocialConnection'

const DashboardTab     = dynamic(() => import('@/components/tabs/DashboardTab').then((m) => m.DashboardTab),         { ssr: false })
const ReelsTab         = dynamic(() => import('@/components/tabs/ReelsTab').then((m) => m.ReelsTab),                 { ssr: false })
const HistoriasTab     = dynamic(() => import('@/components/tabs/HistoriasTab').then((m) => m.HistoriasTab),         { ssr: false })
const PublicacionesTab = dynamic(() => import('@/components/tabs/PublicacionesTab').then((m) => m.PublicacionesTab), { ssr: false })
const CompetenciaTab   = dynamic(() => import('@/components/tabs/CompetenciaTab').then((m) => m.CompetenciaTab),     { ssr: false })
const ReferenciasTab   = dynamic(() => import('@/components/tabs/ReferenciasTab').then((m) => m.ReferenciasTab),     { ssr: false })
const DemografiaTab    = dynamic(() => import('@/components/tabs/DemografiaTab').then((m) => m.DemografiaTab),       { ssr: false })
const PublicarTab      = dynamic(() => import('@/components/tabs/PublicarTab').then((m) => m.PublicarTab),           { ssr: false })
const ComentariosTab   = dynamic(() => import('@/components/tabs/ComentariosTab').then((m) => m.ComentariosTab),     { ssr: false })
const MensajesTab      = dynamic(() => import('@/components/tabs/MensajesTab').then((m) => m.MensajesTab),           { ssr: false })
const AudienciaTab     = dynamic(() => import('@/components/tabs/AudienciaTab').then((m) => m.AudienciaTab),         { ssr: false })

export function InstagramContent() {
  const [tab] = useTab()
  const { summary, reels, loading, hasLoaded, syncing, sync, refresh } = useInstagramData()
  const { disconnect } = useSocialConnection('instagram', { onConnectSuccess: () => void refresh() })
  const [disconnecting, setDisconnecting] = useState(false)

  const connected = !!summary?.connected && !summary.tokenExpired

  async function handleDisconnect() {
    setDisconnecting(true)
    await disconnect()
    await refresh()
    setDisconnecting(false)
  }

  const ctxValue: InstagramDataContextValue = useMemo(
    () => ({
      connected,
      hasRealData: connected && reels.length > 0,
      summary,
      reels,
      loading,
      hasLoaded,
    }),
    [connected, reels, loading, summary, hasLoaded],
  )

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Redes sociales"
        title="IG Intelligence"
        description="Análisis profundo de tu cuenta de Instagram."
        icon={Camera}
        actions={
          <div className="flex items-center gap-2">
            <TimeFilter />
            {connected && (
              <button
                type="button"
                onClick={() => void sync()}
                disabled={syncing}
                className="btn btn-secondary btn-sm"
              >
                {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {syncing ? 'Sincronizando…' : 'Sincronizar'}
              </button>
            )}
            {connected && (
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                disabled={disconnecting}
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {disconnecting ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
                Desconectar
              </button>
            )}
          </div>
        }
      />

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
        {tab === 'publicar'      && <PublicarTab />}
        {tab === 'comentarios'   && <ComentariosTab />}
        {tab === 'mensajes'      && <MensajesTab />}
        {tab === 'audiencia'     && <AudienciaTab />}
      </InstagramDataProvider>
    </div>
  )
}
