'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, FileText, Sparkles, Trash2, Link2, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Section } from '@/components/ui/Section'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import type { Platform } from '@/components/ui/PlatformBadge'
import { ResultPanel } from './ResultPanel'
import { HistoryRow } from './HistoryRow'
import type { CurrentResult, HistoryItem } from './types'

function inferPlatformFromUrl(url: string): Platform | null {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/instagram\.com\/(p|reel|reels|tv)\//i.test(url)) return 'instagram'
  return null
}

export function TranscriptView() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<CurrentResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<HistoryItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const r = await fetch('/api/transcript')
      if (!r.ok) {
        setHistory([])
        return
      }
      const data = (await r.json()) as { items: HistoryItem[] }
      setHistory(data.items ?? [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    const platform = inferPlatformFromUrl(trimmed)
    if (!platform) {
      setError('La URL debe ser de YouTube o Instagram.')
      return
    }
    setLoading(true)
    setError(null)
    setCurrent(null)
    try {
      const r = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError((data && data.error) || 'Error al procesar el video.')
        return
      }
      setCurrent({
        id: data.id,
        url: data.url,
        platform: data.platform,
        title: data.title,
        creator: data.creator,
        duration: data.duration,
        thumbnail: data.thumbnail,
        transcript: data.transcript ?? '',
        summary: data.summary ?? '',
      })
      setUrl('')
      void loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    const previous = history
    setDeleting(true)
    setHistory(history.filter((h) => h.id !== id))
    if (expandedId === id) setExpandedId(null)
    try {
      const r = await fetch('/api/transcript', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!r.ok) {
        setHistory(previous)
        toast.error('No se pudo eliminar el transcript.')
      } else {
        toast.success('Transcript eliminado.')
      }
    } catch {
      setHistory(previous)
      toast.error('Error de red al eliminar.')
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <div className="page-shell" style={{ maxWidth: '64rem' }}>
      <PageHeader
        eyebrow="Contenido"
        title="Transcript"
        description="Pegá un link de YouTube o Instagram y obtené la transcripción completa con un resumen IA."
        icon={FileText}
      />

      {/* Input form */}
      <form onSubmit={handleSubmit} className="surface-elevated p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div
            className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[var(--accent)]"
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
          >
            <Link2 size={16} style={{ color: 'var(--muted-foreground)' }} aria-hidden="true" />
            <label htmlFor="transcript-url" className="sr-only">
              URL de YouTube o Instagram
            </label>
            <input
              id="transcript-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…  ó  https://instagram.com/reel/…"
              required
              disabled={loading}
              aria-describedby={error ? 'transcript-error' : undefined}
              aria-invalid={error ? true : undefined}
              className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50"
              style={{ color: 'var(--foreground)' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || url.trim().length === 0}
            aria-busy={loading || undefined}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer hover:brightness-110 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            style={{
              background: 'var(--gradient-accent)',
              color: 'var(--accent-foreground)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              : <Sparkles size={14} aria-hidden="true" />}
            {loading ? 'Procesando…' : 'Transcribir'}
          </button>
        </div>
        {error && (
          <p id="transcript-error" role="alert" className="mt-3 text-sm" style={{ color: 'var(--destructive)' }}>
            {error}
          </p>
        )}
        {loading && (
          <p role="status" aria-live="polite" className="mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Esto puede tardar 30-90 segundos. Apify resuelve el video, Groq Whisper transcribe, Claude resume.
          </p>
        )}
      </form>

      {/* Current result */}
      {current && (
        <div className="mb-8">
          <ResultPanel result={current} />
        </div>
      )}

      {/* History */}
      <Section eyebrow="Historial" flush>
        {historyLoading ? (
          <div role="status" aria-live="polite" aria-label="Cargando historial" className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Cargando…
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aún no hay transcripts"
            description="Pegá un link de YouTube o Instagram arriba y aparecerá acá."
          />
        ) : (
          <div className="grid gap-3">
            {history.map((item) => (
              <HistoryRow
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onRequestDelete={() => setPendingDelete(item)}
              />
            ))}
          </div>
        )}
      </Section>

      {pendingDelete && (
        <ConfirmDeleteModal
          title="Eliminar transcript"
          description={
            <>
              Vas a eliminar permanentemente <strong>&ldquo;{pendingDelete.title ?? pendingDelete.url}&rdquo;</strong> y su transcripción. Esta acción no se puede deshacer.
            </>
          }
          confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
          busy={deleting}
          icon={<Trash2 size={12} />}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}
