'use client'

import { useState, useRef } from 'react'
import { Loader2, Sparkles, ChevronDown, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/competidores/ModelSelector'
import { CostBadge } from '@/components/competidores/CostBadge'
import { DEFAULT_MODEL, estimateClaudeCost, getModelMeta } from '@/lib/claude/models'
import type { ClaudeModelId } from '@/lib/claude/models'
import type { ReelDTO, TranscriptionDTO, AnalysisDTO, AnalyzeResponse } from '@/lib/types/competidores'

// Rough token estimate for pre-action cost display
const ESTIMATE_INPUT_TOKENS = 1500
const ESTIMATE_OUTPUT_TOKENS = 400

interface AnalysisSectionProps {
  reel: ReelDTO
  transcription: TranscriptionDTO | null
  analyses: AnalysisDTO[]
  onAnalyzed: (a: AnalysisDTO) => void
}

// Section config: label + mix value for chips.
// Using CSS color-mix so chips adapt to both light and dark themes.
const SECTION_CONFIG = [
  { key: 'painPoints' as const, label: 'Dolores',   mix: 'var(--destructive)' },
  { key: 'desires' as const,    label: 'Deseos',    mix: 'color-mix(in srgb, var(--accent) 100%, #10B981 0%)' },
  { key: 'problems' as const,   label: 'Problemas', mix: 'color-mix(in srgb, var(--destructive) 60%, var(--accent) 40%)' },
  { key: 'insights' as const,   label: 'Insights',  mix: 'var(--accent)' },
  { key: 'keywords' as const,   label: 'Keywords',  mix: 'color-mix(in srgb, var(--accent) 50%, var(--foreground) 50%)' },
] as const

type SectionKey = (typeof SECTION_CONFIG)[number]['key']

function ChipList({ items, mix }: { items: string[]; mix: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${i}-${item.slice(0, 20)}`}
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{
            backgroundColor: `color-mix(in srgb, ${mix} 15%, transparent)`,
            color: mix,
            border: `1px solid color-mix(in srgb, ${mix} 30%, transparent)`,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function AnalysisDisplay({ analysis }: { analysis: AnalysisDTO }) {
  return (
    <div className="flex flex-col gap-3">
      {SECTION_CONFIG.map(({ key, label, mix }) => {
        const items: string[] = analysis[key as SectionKey]
        if (items.length === 0) return null
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <span
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: mix }}
            >
              {label}
            </span>
            <ChipList items={items} mix={mix} />
          </div>
        )
      })}
    </div>
  )
}

function AnalysisHistoryRow({ analysis }: { analysis: AnalysisDTO }) {
  const [expanded, setExpanded] = useState(false)

  const createdLabel = new Date(analysis.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <span className="font-medium" style={{ color: 'var(--foreground)' }}>
            {analysis.model}
          </span>
          <span>·</span>
          <span>{createdLabel}</span>
          {analysis.costUsd != null && (
            <>
              <span>·</span>
              <CostBadge usd={analysis.costUsd} />
            </>
          )}
        </span>
        <ChevronDown
          size={14}
          className="flex-shrink-0 transition-transform"
          style={{
            color: 'var(--muted-foreground)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {expanded && (
        <div
          className="px-3 pb-3 pt-1"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <AnalysisDisplay analysis={analysis} />
        </div>
      )}
    </div>
  )
}

/**
 * Tab 3 — Análisis.
 * Gated behind transcription. Shows ModelSelector + extract button.
 * Displays latest analysis as chip lists, history as collapsible rows.
 */
export function AnalysisSection({
  reel,
  transcription,
  analyses,
  onAnalyzed,
}: AnalysisSectionProps) {
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(DEFAULT_MODEL)
  const [loading, setLoading] = useState(false)
  const analyzingRef = useRef(false)

  const latestAnalysis = analyses.length > 0 ? analyses[0] : null
  const historyAnalyses = analyses.length > 1 ? analyses.slice(1) : []

  const estimatedCost = estimateClaudeCost(
    selectedModel,
    ESTIMATE_INPUT_TOKENS,
    ESTIMATE_OUTPUT_TOKENS,
  )

  async function handleAnalyze() {
    if (analyzingRef.current) return
    analyzingRef.current = true
    setLoading(true)
    try {
      const res = await fetch(`/api/reels/${reel.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel }),
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? `Error ${res.status}`)
      }

      const data = (await res.json()) as AnalyzeResponse
      onAnalyzed(data.analysis)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al analizar'
      toast.error(msg)
    } finally {
      analyzingRef.current = false
      setLoading(false)
    }
  }

  // ── No transcription gate ─────────────────────────────────────────────────
  if (!transcription) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 pt-10">
        <div
          className="rounded-2xl p-3"
          style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 80%, transparent)' }}
        >
          <AlertCircle size={22} style={{ color: 'var(--muted-foreground)' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Necesitas transcribir primero
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Ve a la pestaña Transcripción para generar el texto del audio antes de analizar.
          </p>
        </div>
      </div>
    )
  }

  // ── Has transcription ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Model selector */}
      <ModelSelector value={selectedModel} onChange={setSelectedModel} />

      {/* Latest analysis */}
      {latestAnalysis ? (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Último análisis
            </span>
            <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
              <span>{latestAnalysis.model}</span>
              {latestAnalysis.costUsd != null && (
                <CostBadge usd={latestAnalysis.costUsd} />
              )}
            </div>
          </div>
          <AnalysisDisplay analysis={latestAnalysis} />
        </div>
      ) : (
        <div
          className="flex flex-col items-center gap-2 rounded-xl p-6 text-center"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <Sparkles size={20} style={{ color: 'var(--muted-foreground)' }} />
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            No hay análisis todavía. Extrae insights del reel con el botón de abajo.
          </p>
        </div>
      )}

      {/* Re-analyze / analyze button */}
      <div className="flex flex-col gap-1.5">
        <Button
          onClick={handleAnalyze}
          disabled={loading}
          size="sm"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Analizando…
            </>
          ) : (
            <>
              <Sparkles size={14} />
              {latestAnalysis
                ? `Re-analizar con ${getModelMeta(selectedModel).label}`
                : 'Extraer información'}
            </>
          )}
        </Button>
        <div className="flex justify-center">
          <CostBadge usd={estimatedCost} label={getModelMeta(selectedModel).label} />
        </div>
      </div>

      {/* History */}
      {historyAnalyses.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
            Historial
          </span>
          {historyAnalyses.map((a) => (
            <AnalysisHistoryRow key={a.id} analysis={a} />
          ))}
        </div>
      )}
    </div>
  )
}
