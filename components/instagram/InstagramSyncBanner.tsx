'use client'

/**
 * Banner shown at the top of the /instagram page.
 *
 * Connection model: Apify-first.
 *   The user types their @handle, we persist it to SocialConnection (no
 *   OAuth, no tokens) and subsequent syncs scrape via Apify. The legacy
 *   OAuth path still works if the SocialConnection has a real access token
 *   (e.g. created by a previous Meta-App-Review-aware flow).
 *
 * States:
 *   - Loading            → skeleton row
 *   - Not connected      → @handle input + "Conectar"
 *   - Connected, empty   → "Sincronizar ahora" CTA
 *   - Token expired      → "Reconectar" (legacy OAuth connections only)
 *   - Connected + data   → small "N reels · @handle" badge
 */

import { useState, type FormEvent } from 'react'
import { Camera, Loader2, RefreshCw, AlertTriangle, CheckCircle2, AtSign } from 'lucide-react'
import { toast } from 'sonner'
import type { InstagramAccountSummary } from '@/hooks/useInstagramData'

interface Props {
  summary: InstagramAccountSummary | null
  loading: boolean
  syncing: boolean
  onSync: () => void
  onConnected?: () => void
  reelCount: number
  loadedReels?: number
}

export function InstagramSyncBanner({ summary, loading, syncing, onSync, onConnected, reelCount, loadedReels }: Props) {
  const [handle, setHandle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleConnect(e: FormEvent) {
    e.preventDefault()
    const trimmed = handle.trim().replace(/^@/, '')
    if (!trimmed) {
      toast.error('Ingresá tu @handle de Instagram.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/instagram/connect-handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: trimmed }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null
        toast.error(
          data?.detail
            ? `No pudimos conectar: ${data.detail}`
            : data?.error === 'RATE_LIMIT'
              ? 'Probá de nuevo en un minuto.'
              : 'No pudimos conectar. Revisá el @handle.',
        )
        return
      }
      toast.success(`Instagram conectado como @${trimmed}.`)
      setHandle('')
      onConnected?.()
    } catch {
      toast.error('Error de red al conectar Instagram.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 text-sm"
        style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
      >
        <Loader2 size={14} className="animate-spin" />
        Cargando estado de Instagram…
      </div>
    )
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!summary?.connected) {
    return (
      <form
        onSubmit={handleConnect}
        className="flex flex-col gap-3 rounded-xl px-4 py-3 mb-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#E1306C18', border: '1px solid #E1306C30' }}
          >
            <Camera size={16} style={{ color: '#E1306C' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Conecta tu cuenta de Instagram
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Ingresá tu @handle. Sincronizamos públicamente vía scraper — sin pedir login a Meta.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
            }}
          >
            <AtSign size={13} style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={submitting}
              placeholder="tu_handle"
              maxLength={30}
              className="bg-transparent outline-none text-sm w-32"
              style={{ color: 'var(--foreground)' }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !handle.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {submitting ? 'Conectando…' : 'Conectar'}
          </button>
        </div>
      </form>
    )
  }

  // ── Connected but token expired (legacy OAuth path) ───────────────────────
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
              Reconectá la cuenta tipeando de nuevo tu @handle abajo.
            </p>
          </div>
        </div>
        <form onSubmit={handleConnect} className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
            }}
          >
            <AtSign size={13} style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={submitting}
              placeholder="tu_handle"
              maxLength={30}
              className="bg-transparent outline-none text-sm w-28"
              style={{ color: 'var(--foreground)' }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !handle.trim()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            <RefreshCw size={14} />
            Reconectar
          </button>
        </form>
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
      className="flex items-center justify-between gap-4 rounded-xl px-4 py-2.5 mb-4"
      style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
        <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
        <span>
          {reelCount} reels sincronizados
          {typeof loadedReels === 'number' && loadedReels < reelCount
            ? ` · mostrando ${loadedReels} (cargá más abajo)`
            : ''}
          {summary.latestSnapshot ? ` · ${summary.latestSnapshot.followers.toLocaleString('es-ES')} seguidores` : ''}
          {summary.accountName ? ` · @${summary.accountName}` : ''}
        </span>
      </div>
      <button
        type="button"
        onClick={onSync}
        disabled={syncing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60"
        style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
      >
        {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        {syncing ? 'Sincronizando…' : 'Re-sincronizar'}
      </button>
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
