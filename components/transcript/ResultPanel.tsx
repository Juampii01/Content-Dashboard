/**
 * ResultPanel — show a single transcribed video.
 *
 * Used in two places:
 *   1. Right after a successful POST (the freshly returned `current` result)
 *   2. Inside an expanded HistoryRow (the previously-stored item)
 *
 * The shape is identical so the same component works for both.
 */
import { ExternalLink, FileText, Sparkles } from 'lucide-react'
import { PlatformBadge } from '@/components/ui/PlatformBadge'
import { CopyButton } from '@/components/ui/CopyButton'
import { SummaryBlock } from './SummaryBlock'
import type { CurrentResult } from './types'

export function ResultPanel({ result }: { result: CurrentResult }) {
  return (
    <div
      className="rounded-2xl p-5 card-lift"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-3 mb-4">
        <PlatformBadge platform={result.platform} />
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
          <ExternalLink size={11} aria-hidden="true" /> abrir original
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
              <Sparkles size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
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
            <FileText size={14} style={{ color: 'var(--muted-foreground)' }} aria-hidden="true" />
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
