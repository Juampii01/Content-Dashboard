'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Copy,
  Check,
  Loader2,
  FileText,
  Sparkles,
  Trash2,
  Play,
  Camera,
  Link2,
  ExternalLink,
  Inbox,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Section } from '@/components/ui/Section'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'

interface HistoryItem {
  id: string
  url: string
  platform: 'youtube' | 'instagram'
  title: string | null
  creator: string | null
  duration: string | null
  thumbnail: string | null
  transcript: string | null
  summary: string | null
  createdAt: string
}

interface CurrentResult {
  id?: string
  url: string
  platform: 'youtube' | 'instagram'
  title: string | null
  creator: string | null
  duration: string | null
  thumbnail: string | null
  transcript: string
  summary: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function inferPlatformFromUrl(url: string): 'youtube' | 'instagram' | null {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/instagram\.com\/(p|reel|reels|tv)\//i.test(url)) return 'instagram'
  return null
}

// ─── Summary block parser (RESUMEN / PUNTOS CLAVE / CONCLUSIÓN) ──────────────

const SECTION_STYLES: Record<
  string,
  { fg: string; bg: string; border: string }
> = {
  RESUMEN: {
    fg: 'color-mix(in srgb, var(--secondary, #1e3a8a) 80%, var(--foreground))',
    bg: 'color-mix(in srgb, var(--secondary, #1e3a8a) 8%, transparent)',
    border: 'color-mix(in srgb, var(--secondary, #1e3a8a) 25%, var(--border))',
  },
  'PUNTOS CLAVE': {
    fg: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--accent) 8%, transparent)',
    border: 'color-mix(in srgb, var(--accent) 25%, var(--border))',
  },
  CONCLUSIÓN: {
    fg: 'color-mix(in srgb, var(--foreground) 90%, transparent)',
    bg: 'color-mix(in srgb, var(--stat-icon) 10%, transparent)',
    border: 'color-mix(in srgb, var(--stat-icon) 25%, var(--border))',
  },
}

interface SummarySection {
  header: string | null
  body: string
}

function splitSummary(text: string): SummarySection[] {
  const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/#{1,3}\s*/g, '').trim()
  return clean
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.trim().split('\n')
      const first = lines[0]?.trim() ?? ''
      const isHeader = /^[A-ZÁÉÍÓÚÑ\s]{3,40}$/.test(first)
      if (isHeader && lines.length > 1) {
        return { header: first, body: lines.slice(1).join('\n').trim() }
      }
      return { header: null, body: block.trim() }
    })
    .filter((s) => s.body.length > 0)
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handle = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    })
  }, [text])
  return (
    <button
      type="button"
      onClick={handle}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        color: 'var(--muted-foreground)',
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copiado' : label}
    </button>
  )
}

// ─── Platform pill ────────────────────────────────────────────────────────────

function PlatformPill({ platform }: { platform: 'youtube' | 'instagram' }) {
  const Icon = platform === 'youtube' ? Play : Camera
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{
        border: '1px solid var(--border)',
        color: 'var(--accent)',
        backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
      }}
    >
      <Icon size={11} />
      {platform === 'youtube' ? 'YouTube' : 'Instagram'}
    </span>
  )
}

// ─── Summary renderer ────────────────────────────────────────────────────────

function SummaryBlock({ text }: { text: string }) {
  const sections = splitSummary(text)
  if (sections.length === 0) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--muted-foreground)' }}>
        {text}
      </p>
    )
  }
  return (
    <div className="grid gap-3">
      {sections.map((s, i) => {
        const cfg = s.header ? SECTION_STYLES[s.header] : null
        return (
          <div
            key={i}
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${cfg?.border ?? 'var(--border)'}` }}
          >
            {s.header && cfg && (
              <div
                className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ background: cfg.bg, color: cfg.fg, borderBottom: `1px solid ${cfg.border}` }}
              >
                {s.header}
              </div>
            )}
            <div className="px-4 py-3.5" style={{ backgroundColor: 'var(--card)' }}>
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--foreground)' }}
              >
                {s.body}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Result panel ────────────────────────────────────────────────────────────

function ResultPanel({ result }: { result: CurrentResult }) {
  return (
    <div
      className="rounded-2xl p-5 card-lift"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-3 mb-4">
        <PlatformPill platform={result.platform} />
        {result.duration && (
          <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
            {result.duration}
          </span>
        )}
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-auto inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ExternalLink size={11} /> abrir original
        </a>
      </div>

      <h2
        className="text-lg font-semibold leading-tight mb-1"
        style={{ color: 'var(--foreground)' }}
      >
        {result.title ?? 'Sin título'}
      </h2>
      {result.creator && (
        <p className="text-xs mb-5" style={{ color: 'var(--muted-foreground)' }}>
          {result.creator}
        </p>
      )}

      {result.summary && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Resumen IA
              </h3>
            </div>
            <CopyButton text={result.summary} label="Copiar resumen" />
          </div>
          <SummaryBlock text={result.summary} />
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: 'var(--muted-foreground)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Transcripción completa
            </h3>
          </div>
          <CopyButton text={result.transcript} label="Copiar transcript" />
        </div>
        <div
          className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--card) 60%, var(--background))',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          {result.transcript}
        </div>
      </section>
    </div>
  )
}

// ─── Main view ───────────────────────────────────────────────────────────────

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
      <form
        onSubmit={handleSubmit}
        className="surface-elevated p-4 mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
          >
            <Link2 size={16} style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…  ó  https://instagram.com/reel/…"
              required
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50"
              style={{ color: 'var(--foreground)' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || url.trim().length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer hover:brightness-110 active:brightness-95"
            style={{
              background: 'var(--gradient-accent)',
              color: 'var(--accent-foreground)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Procesando…' : 'Transcribir'}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm" style={{ color: 'var(--destructive)' }}>
            {error}
          </p>
        )}
        {loading && (
          <p className="mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
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
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            <Loader2 size={14} className="animate-spin" /> Cargando…
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aún no hay transcripts"
            description="Pegá un link de YouTube o Instagram arriba y aparecerá acá."
          />
        ) : (
          <div className="grid gap-3">
            {history.map((item) => {
              const expanded = expandedId === item.id
              return (
                <div
                  key={item.id}
                  className="rounded-xl card-lift"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                    className="w-full text-left p-4 flex items-start gap-3 cursor-pointer"
                  >
                    <PlatformPill platform={item.platform} />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold leading-tight truncate"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {item.title ?? item.url}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        {[item.creator, item.duration, formatDate(item.createdAt)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPendingDelete(item)
                      }}
                      className="p-2 rounded-lg hover:opacity-70 transition-opacity cursor-pointer"
                      style={{ color: 'var(--muted-foreground)' }}
                      aria-label="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </button>
                  {expanded && (
                    <div className="px-4 pb-4">
                      <ResultPanel
                        result={{
                          id: item.id,
                          url: item.url,
                          platform: item.platform,
                          title: item.title,
                          creator: item.creator,
                          duration: item.duration,
                          thumbnail: item.thumbnail,
                          transcript: item.transcript ?? '',
                          summary: item.summary ?? '',
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
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
