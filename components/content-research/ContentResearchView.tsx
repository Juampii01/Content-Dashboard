'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Search,
  Loader2,
  Trash2,
  ExternalLink,
  Sparkles,
  Eye,
  ChevronDown,
  ChevronUp,
  Telescope,
  Inbox,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Section } from '@/components/ui/Section'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import { PlatformBadge, type Platform } from '@/components/ui/PlatformBadge'
import { formatK } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/formatDate'
import { toast } from 'sonner'

interface ResearchVideo {
  videoId: string
  title: string
  description: string
  thumbnail: string | null
  videoUrl: string
  views: number
  likes: number
  comments: number
  duration: string
  publishedAt: string | null
  transcript: string | null
  analysis: string | null
}

interface ResearchRow {
  id: string
  platform: Platform
  channelUrl: string
  channelName: string | null
  channelAvatar: string | null
  timeframeDays: number
  videos: ResearchVideo[]
  createdAt: string
}

const dateOpts: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

// Truncate text to N chars with ellipsis
function trunc(text: string | null, n = 120): string {
  if (!text) return '—'
  return text.length > n ? text.slice(0, n) + '…' : text
}

// ────────────────────────────────────────────────────────────
// Single research panel — collapsible table
// ────────────────────────────────────────────────────────────
function ResearchPanel({
  row,
  defaultOpen = false,
  onDelete,
}: {
  row: ResearchRow
  defaultOpen?: boolean
  onDelete?: () => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const showThumb      = row.platform !== 'instagram'
  const showTranscript = row.platform !== 'instagram'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* ── Header row ── */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Platform icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <PlatformBadge platform={row.platform} variant="icon" size={18} />
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold capitalize" style={{ color: 'var(--foreground)' }}>
              {row.platform === 'youtube' ? 'Youtube' : 'Instagram'}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--success, #22c55e) 12%, transparent)',
                color: 'var(--success, #22c55e)',
                border: '1px solid color-mix(in srgb, var(--success, #22c55e) 28%, transparent)',
              }}
            >
              <CheckCircle2 size={10} />
              Completado
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {row.channelName ?? row.channelUrl}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>
            {formatDate(row.createdAt, dateOpts)} · Últimos {row.timeframeDays} días · {row.videos.length} videos
          </p>
        </div>

        {/* Actions */}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-lg hover:opacity-70 cursor-pointer transition-opacity"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label="Eliminar investigación"
          >
            <Trash2 size={14} />
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:brightness-110"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          Ver Resultados
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* ── Table ── */}
      {open && (
        <div className="overflow-x-auto" style={{ borderTop: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: 'var(--muted-foreground)' }}>
                  Creator
                </th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: 'var(--muted-foreground)' }}>
                  URL
                </th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--muted-foreground)', minWidth: '180px' }}>
                  Hook
                </th>
                <th className="text-right px-4 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: 'var(--muted-foreground)' }}>
                  Views
                </th>
                <th className="text-right px-4 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: 'var(--muted-foreground)' }}>
                  Duración
                </th>
                {showTranscript && (
                  <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--muted-foreground)', minWidth: '220px' }}>
                    Transcript
                  </th>
                )}
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--muted-foreground)', minWidth: '220px' }}>
                  Análisis
                </th>
                {showThumb && (
                  <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--muted-foreground)' }}>
                    Thumbnail
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {row.videos.map((v, i) => (
                <VideoRow
                  key={v.videoId}
                  video={v}
                  creator={row.channelName ?? row.channelUrl}
                  showThumb={showThumb}
                  showTranscript={showTranscript}
                  isLast={i === row.videos.length - 1}
                />
              ))}
            </tbody>
          </table>

          {/* Video count footer */}
          <div
            className="px-5 py-2.5 text-[11px]"
            style={{ color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)' }}
          >
            {row.videos.length} videos
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Table row for a single video
// ────────────────────────────────────────────────────────────
function VideoRow({
  video,
  creator,
  showThumb,
  showTranscript,
  isLast,
}: {
  video: ResearchVideo
  creator: string
  showThumb: boolean
  showTranscript: boolean
  isLast: boolean
}) {
  const [expandTranscript, setExpandTranscript] = useState(false)
  const [expandAnalysis, setExpandAnalysis] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <tr
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        verticalAlign: 'top',
      }}
    >
      {/* Creator */}
      <td className="px-4 py-3 whitespace-nowrap font-medium" style={{ color: 'var(--foreground)' }}>
        {creator}
      </td>

      {/* URL */}
      <td className="px-4 py-3 whitespace-nowrap">
        <a
          href={video.videoUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 font-medium hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          Ver <ExternalLink size={10} />
        </a>
      </td>

      {/* Hook / Title */}
      <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', maxWidth: '220px' }}>
        <span className="leading-snug" style={{ color: 'var(--foreground)' }}>
          {video.title || '—'}
        </span>
      </td>

      {/* Views */}
      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums font-medium"
        style={{ color: 'var(--foreground)' }}>
        <span className="inline-flex items-center justify-end gap-1">
          <Eye size={11} style={{ color: 'var(--muted-foreground)' }} />
          {formatK(video.views)}
        </span>
      </td>

      {/* Duration */}
      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums"
        style={{ color: 'var(--muted-foreground)' }}>
        {video.duration || '—'}
      </td>

      {/* Transcript — YouTube only */}
      {showTranscript && (
        <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', maxWidth: '260px' }}>
          {video.transcript ? (
            <div>
              <p className="leading-relaxed">
                {expandTranscript ? video.transcript : trunc(video.transcript, 120)}
              </p>
              {video.transcript.length > 120 && (
                <button
                  type="button"
                  onClick={() => setExpandTranscript((v) => !v)}
                  className="inline-flex items-center gap-1 mt-1 font-semibold hover:opacity-70 cursor-pointer"
                  style={{ color: 'var(--accent)', fontSize: '10px' }}
                >
                  <FileText size={10} />
                  {expandTranscript ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </div>
          ) : (
            <span style={{ opacity: 0.45 }}>—</span>
          )}
        </td>
      )}

      {/* Análisis */}
      <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', maxWidth: '260px' }}>
        {video.analysis ? (
          <div>
            <p className="leading-relaxed">
              {expandAnalysis ? video.analysis : trunc(video.analysis, 120)}
            </p>
            {video.analysis.length > 120 && (
              <button
                type="button"
                onClick={() => setExpandAnalysis((v) => !v)}
                className="inline-flex items-center gap-1 mt-1 font-semibold hover:opacity-70 cursor-pointer"
                style={{ color: 'var(--accent)', fontSize: '10px' }}
              >
                <Sparkles size={10} />
                {expandAnalysis ? 'Ver menos' : 'Ver más'}
              </button>
            )}
          </div>
        ) : (
          <span style={{ opacity: 0.45 }}>—</span>
        )}
      </td>

      {/* Thumbnail — YouTube only */}
      {showThumb && (
        <td className="px-4 py-3">
          {video.thumbnail && !imgFailed ? (
            <div
              className="relative overflow-hidden rounded-lg flex-shrink-0"
              style={{ width: 72, height: 40 }}
            >
              <Image
                src={video.thumbnail}
                alt=""
                fill
                sizes="72px"
                className="object-cover"
                onError={() => setImgFailed(true)}
                unoptimized
              />
            </div>
          ) : (
            <div
              className="rounded-lg flex-shrink-0"
              style={{
                width: 72,
                height: 40,
                backgroundColor: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            />
          )}
        </td>
      )}
    </tr>
  )
}

// ────────────────────────────────────────────────────────────
// Main view
// ────────────────────────────────────────────────────────────
interface ContentResearchViewProps {
  /** When provided by a hub, filter history and current result to this platform. */
  platform?: Platform
  /** Hide the PageHeader (used when embedded inside a hub). */
  embedded?: boolean
}

export function ContentResearchView({ platform: platformFilter, embedded = false }: ContentResearchViewProps) {
  const [channelUrl, setChannelUrl] = useState('')
  const [timeframe, setTimeframe] = useState<number>(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<ResearchRow | null>(null)
  const [history, setHistory] = useState<ResearchRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<ResearchRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const r = await fetch('/api/content-research')
      const data = await r.json()
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

  // Reset input/error when platform filter changes
  useEffect(() => {
    setChannelUrl('')
    setError(null)
    setCurrent(null)
  }, [platformFilter])

  // Platform-specific URL placeholder
  const urlPlaceholder =
    platformFilter === 'youtube'
      ? 'https://www.youtube.com/@canal'
      : platformFilter === 'instagram'
      ? 'https://instagram.com/usuario'
      : 'https://www.youtube.com/@canal  ó  https://instagram.com/usuario'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = channelUrl.trim()
    if (!trimmed) return

    // Platform-specific URL validation when a filter is active
    if (platformFilter === 'youtube' && !trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
      setError('Ingresá una URL de YouTube válida (youtube.com o youtu.be).')
      return
    }
    if (platformFilter === 'instagram' && !trimmed.includes('instagram.com')) {
      setError('Ingresá una URL de Instagram válida (instagram.com/usuario).')
      return
    }

    setLoading(true)
    setError(null)
    setCurrent(null)
    try {
      const r = await fetch('/api/content-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: trimmed, timeframeDays: timeframe }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? 'Error en la búsqueda.')
        return
      }
      setCurrent(data as ResearchRow)
      setChannelUrl('')
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
    try {
      const r = await fetch('/api/content-research', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!r.ok) {
        setHistory(previous)
        toast.error('No se pudo eliminar la investigación.')
      } else {
        toast.success('Investigación eliminada.')
      }
    } catch {
      setHistory(previous)
      toast.error('Error de red al eliminar.')
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  const visibleHistory = platformFilter
    ? history.filter((r) => r.platform === platformFilter)
    : history
  const visibleCurrent =
    current && (!platformFilter || current.platform === platformFilter) ? current : null

  return (
    <div className={embedded ? '' : 'page-shell'} style={embedded ? undefined : { maxWidth: '80rem' }}>
      {!embedded && (
        <PageHeader
          eyebrow="Contenido"
          title="Content Research"
          description="Pegá un canal de YouTube o un perfil de Instagram. Te traemos sus 5 videos más vistos del periodo y los analizamos con IA."
          icon={Telescope}
        />
      )}

      {/* Search form */}
      <form onSubmit={handleSubmit} className="surface-elevated p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div
            className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[var(--accent)]"
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
          >
            <Search size={16} style={{ color: 'var(--muted-foreground)' }} aria-hidden="true" />
            <label htmlFor="research-channel" className="sr-only">
              URL del canal de YouTube o perfil de Instagram
            </label>
            <input
              id="research-channel"
              type="url"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder={urlPlaceholder}
              required
              disabled={loading}
              aria-describedby={error ? 'research-error' : undefined}
              aria-invalid={error ? true : undefined}
              className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50"
              style={{ color: 'var(--foreground)' }}
            />
          </div>
          <label htmlFor="research-timeframe" className="sr-only">
            Periodo de búsqueda
          </label>
          <select
            id="research-timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
            disabled={loading}
            className="rounded-xl px-3 py-2.5 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={365}>Último año</option>
          </select>
          <button
            type="submit"
            disabled={loading || channelUrl.trim().length === 0}
            aria-busy={loading || undefined}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer hover:brightness-110 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            style={{
              background: 'var(--gradient-accent)',
              color: 'var(--accent-foreground)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
            {loading ? 'Buscando…' : 'Investigar'}
          </button>
        </div>
        {error && (
          <p id="research-error" role="alert" className="mt-3 text-sm" style={{ color: 'var(--destructive)' }}>
            {error}
          </p>
        )}
      </form>

      {/* Latest result — open by default */}
      {visibleCurrent && (
        <div className="mb-6">
          <ResearchPanel row={visibleCurrent} defaultOpen />
        </div>
      )}

      {/* History */}
      <Section eyebrow="Historial" flush>
        {historyLoading ? (
          <div role="status" aria-live="polite" aria-label="Cargando historial" className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', animationDelay: `${i * 60}ms` }}>
                <div className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: 'var(--muted)' }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 rounded" style={{ width: `${45 + i * 14}%`, backgroundColor: 'var(--muted)' }} />
                  <div className="h-2.5 w-20 rounded" style={{ backgroundColor: 'var(--muted)' }} />
                </div>
                <div className="h-6 w-14 rounded-full shrink-0" style={{ backgroundColor: 'var(--muted)' }} />
              </div>
            ))}
          </div>
        ) : visibleHistory.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aún no investigaste ningún canal"
            description="Pegá una URL arriba y guardamos los resultados acá para que vuelvas cuando quieras."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {visibleHistory.map((row) => (
              <ResearchPanel
                key={row.id}
                row={row}
                onDelete={() => setPendingDelete(row)}
              />
            ))}
          </div>
        )}
      </Section>

      {pendingDelete && (
        <ConfirmDeleteModal
          title="Eliminar investigación"
          description={
            <>
              Vas a eliminar permanentemente la investigación de{' '}
              <strong>&ldquo;{pendingDelete.channelName ?? pendingDelete.channelUrl}&rdquo;</strong>{' '}
              y los {pendingDelete.videos.length} videos analizados. Esta acción no se puede deshacer.
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
