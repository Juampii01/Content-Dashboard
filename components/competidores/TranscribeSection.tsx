'use client'

import { useState } from 'react'
import { Loader2, Copy, Sparkles, AlertCircle, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CostBadge } from '@/components/competidores/CostBadge'
import type { ReelDTO, TranscriptionDTO } from '@/lib/types/competidores'

interface TranscribeSectionProps {
  reel: ReelDTO
  transcription: TranscriptionDTO | null
  onTranscribed: (t: TranscriptionDTO) => void
  onJumpToAnalysis: () => void
  onReelUpdated?: (updatedReel: ReelDTO) => void
}

type TranscribeErrorCode = 'VIDEO_URL_EXPIRED' | 'VIDEO_URL_MISSING' | 'UNKNOWN'

/**
 * Tab 2 — Transcripción.
 * Shows "Transcribir" button when no transcription exists.
 * Shows the transcript text + copy + jump to analysis when transcription is ready.
 */
export function TranscribeSection({
  reel,
  transcription,
  onTranscribed,
  onJumpToAnalysis,
  onReelUpdated,
}: TranscribeSectionProps) {
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [errorCode, setErrorCode] = useState<TranscribeErrorCode | null>(null)
  const [copied, setCopied] = useState(false)
  const [refreshingUrl, setRefreshingUrl] = useState(false)

  async function handleTranscribe() {
    setLoading(true)
    setErrorCode(null)
    setLoadingMsg('Transcribiendo… (puede tardar hasta 2 min)')

    try {
      const res = await fetch(`/api/reels/${reel.id}/transcribe`, {
        method: 'POST',
        credentials: 'same-origin',
      })

      if (!res.ok) {
        if (res.status === 410) {
          setErrorCode('VIDEO_URL_EXPIRED')
          return
        }
        const body = (await res.json()) as { error?: string }
        if (body.error === 'VIDEO_URL_MISSING') {
          setErrorCode('VIDEO_URL_MISSING')
          return
        }
        throw new Error(body.error ?? `Error ${res.status}`)
      }

      const data = (await res.json()) as { transcription: TranscriptionDTO }
      onTranscribed(data.transcription)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al transcribir'
      toast.error(msg)
      setErrorCode('UNKNOWN')
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  async function handleRefreshVideoUrl() {
    setRefreshingUrl(true)
    try {
      const res = await fetch(`/api/reels/${reel.id}/refresh-video-url`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (res.status === 501) {
        toast.info('Feature pendiente, vuelve a scrapear al competidor')
        return
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      const data = (await res.json()) as { reel: ReelDTO }
      onReelUpdated?.(data.reel)
      setErrorCode(null)
      toast.success('URL del video refrescada')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al re-fetchear el reel'
      toast.error(msg)
    } finally {
      setRefreshingUrl(false)
    }
  }

  async function handleCopy() {
    if (!transcription) return
    try {
      await navigator.clipboard.writeText(transcription.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  // ── Error state (video URL expired / missing) ─────────────────────────────
  if (errorCode === 'VIDEO_URL_EXPIRED' || errorCode === 'VIDEO_URL_MISSING') {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div
          className="flex flex-col gap-3 rounded-xl p-4"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--destructive) 25%, transparent)',
          }}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle
              size={16}
              className="mt-0.5 flex-shrink-0"
              style={{ color: 'var(--destructive)' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                URL del video expirada
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                El enlace de descarga de Apify ha caducado. Re-fetcha el reel para obtener uno
                fresco y luego intenta transcribir de nuevo.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="self-start"
            disabled={refreshingUrl}
            onClick={() => void handleRefreshVideoUrl()}
          >
            {refreshingUrl ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCcw size={13} />
            )}
            Re-fetchear este reel
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setErrorCode(null)}
          className="self-start"
        >
          Reintentar
        </Button>
      </div>
    )
  }

  // ── No transcription yet ──────────────────────────────────────────────────
  if (!transcription) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 pt-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            className="mb-1 rounded-2xl p-3"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            }}
          >
            <Sparkles size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Transcripción con IA
          </p>
          <p className="max-w-[260px] text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Transcribe el audio del reel con Groq Whisper para desbloquear análisis y chat
            contextual.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {loadingMsg}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Button onClick={handleTranscribe} size="sm">
              <Sparkles size={14} />
              Transcribir
            </Button>
            <CostBadge usd={0.0003} label="Groq Whisper" />
          </div>
        )}
      </div>
    )
  }

  // ── Transcription available ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
            Transcripción
          </span>
          <Badge variant="outline" className="text-[10px]">
            {transcription.language.toUpperCase()}
          </Badge>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copiar transcripción"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-opacity hover:opacity-70"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Copy size={12} />
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      {/* Transcript text */}
      <ScrollArea className="max-h-64 rounded-xl">
        <div
          className="rounded-xl p-3 text-sm leading-relaxed"
          style={{
            backgroundColor: 'var(--muted)',
            border: '1px solid var(--border)',
            whiteSpace: 'pre-wrap',
            color: 'var(--foreground)',
          }}
        >
          {transcription.text}
        </div>
      </ScrollArea>

      {/* Provider + cost */}
      <div className="flex items-center gap-2">
        <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          {transcription.provider}
        </span>
        {transcription.costUsd != null && (
          <CostBadge usd={transcription.costUsd} />
        )}
      </div>

      {/* Jump to analysis */}
      <Button
        onClick={onJumpToAnalysis}
        className="mt-2 w-full"
        size="sm"
      >
        <Sparkles size={14} />
        Extraer información
      </Button>
    </div>
  )
}
