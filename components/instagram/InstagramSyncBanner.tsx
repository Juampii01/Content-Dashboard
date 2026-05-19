'use client'

/**
 * Banner shown at the top of the /instagram page.
 *
 * - Not connected         → prominent "Conectar Instagram" CTA
 * - Connected, empty      → "Sincronizar ahora" CTA
 * - Connected, token bad  → "Reconectar" CTA
 * - Connected + data      → small "Datos reales · N reels · followers" badge
 */

import { useState } from 'react'
import { Camera, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useSocialConnection } from '@/hooks/useSocialConnection'
import { ConnectAccountModal } from '@/components/shared/ConnectAccountModal'
import type { InstagramAccountSummary } from '@/hooks/useInstagramData'

interface Props {
  summary: InstagramAccountSummary | null
  loading: boolean
  syncing: boolean
  onSync: () => void
  reelCount: number
}

export function InstagramSyncBanner({ summary, loading, syncing, onSync, reelCount }: Props) {
  const { connect } = useSocialConnection('instagram')
  const [modalOpen, setModalOpen] = useState(false)

  if (loading) {
    return (
      <div
        className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-4 animate-pulse"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg shrink-0" style={{ backgroundColor: 'var(--muted)' }} />
          <div className="space-y-1.5">
            <div className="h-3.5 w-44 rounded" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-2.5 w-60 rounded" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
        </div>
        <div className="h-8 w-28 rounded-lg shrink-0" style={{ backgroundColor: 'var(--muted)' }} />
      </div>
    )
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!summary?.connected) {
    return (
      <>
        <div
          className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-4"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--platform-instagram) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--platform-instagram) 19%, transparent)' }}
            >
              <Camera size={16} style={{ color: 'var(--platform-instagram)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Conecta tu cuenta de Instagram
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Sincroniza tus reels y métricas reales. Mientras tanto verás datos de demo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            <Camera size={14} />
            Conectar Instagram
          </button>
        </div>
        <ConnectAccountModal
          platform="instagram"
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </>
    )
  }

  // ── Connected but token expired ────────────────────────────────────────────
  if (summary.tokenExpired) {
    return (
      <div
        className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-4"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--warning) 50%, var(--border))',
        }}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Tu conexión con Instagram expiró
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Reconecta la cuenta para seguir sincronizando datos.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={connect}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          <RefreshCw size={14} />
          Reconectar
        </button>
      </div>
    )
  }

  // ── Connected, no reels yet ────────────────────────────────────────────────
  if (reelCount === 0) {
    return (
      <div
        className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Instagram conectado {summary.accountName ? `como @${summary.accountName}` : ''}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Aún no hemos traído tus reels. Sincroniza para importarlos.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      </div>
    )
  }

  // ── Connected with data ────────────────────────────────────────────────────
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-2.5 mb-4 text-xs"
      style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
    >
      <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
      <span>
        {reelCount} reels sincronizados
        {summary.latestSnapshot ? ` · ${summary.latestSnapshot.followers.toLocaleString('es-ES')} seguidores` : ''}
        {summary.accountName ? ` · @${summary.accountName}` : ''}
      </span>
      {/* Sync button moved to page header — nothing extra here */}
      {syncing && (
        <Loader2 size={12} className="animate-spin ml-auto" style={{ color: 'var(--muted-foreground)' }} />
      )}
    </div>
  )
}

// ── Demo pill — small badge the tabs render when showing mock data ──────────
export function DemoDataPill() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
      style={{
        backgroundColor: 'var(--muted)',
        color: 'var(--muted-foreground)',
        border: '1px dashed var(--border)',
      }}
      title="Estos datos son de demostración. Conecta tu cuenta para ver datos reales."
    >
      Datos de demo
    </span>
  )
}
