'use client'

import { useCallback, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { BasesGenerateField } from '@/lib/schemas/bases/generate'

/**
 * Headless controller for the "Sugerir con IA" flow.
 * POSTs to /api/bases/generate and holds the returned suggestions until the
 * user taps one (which the parent inserts into its real data) or dismisses.
 */
export function useAISuggest(field: BasesGenerateField, count?: number) {
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  const suggest = useCallback(async () => {
    setLoading(true)
    setError('')
    setSuggestions([])
    try {
      const res = await fetch('/api/bases/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(count ? { field, count } : { field }),
      })
      if (!res.ok) {
        if (res.status === 429) throw new Error('Demasiadas solicitudes. Esperá un momento.')
        if (res.status === 503) throw new Error('La IA no está configurada.')
        if (res.status >= 500) throw new Error('Algo salió mal. Probá de nuevo.')
        throw new Error(`Error inesperado (${res.status}).`)
      }
      const data = await res.json()
      if (Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions.filter((x: unknown): x is string => typeof x === 'string'))
      } else {
        throw new Error('Respuesta inesperada del servidor')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [field, count])

  const dropSuggestion = useCallback((value: string) => {
    setSuggestions((prev) => prev.filter((s) => s !== value))
  }, [])

  const clear = useCallback(() => {
    setSuggestions([])
    setError('')
  }, [])

  return { loading, error, suggestions, suggest, dropSuggestion, clear }
}

/** Subtle sparkle button that triggers a suggestion request. */
export function AISuggestButton({
  onClick,
  loading,
  label = 'Sugerir con IA',
  color = 'var(--accent)',
}: {
  onClick: () => void
  loading: boolean
  label?: string
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all hover:opacity-90 disabled:opacity-60 cursor-pointer whitespace-nowrap"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {loading ? (
        <span
          className="w-3 h-3 rounded-full animate-spin"
          style={{ border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`, borderTopColor: color }}
        />
      ) : (
        <Sparkles size={11} />
      )}
      {loading ? 'Pensando…' : label}
    </button>
  )
}

/**
 * Ghost chips: dashed, tappable suggestions. Tapping one calls onPick and the
 * chip is removed from the ghost list. Also renders inline error state.
 */
export function GhostChips({
  suggestions,
  error,
  color = 'var(--accent)',
  onPick,
  onDismissAll,
}: {
  suggestions: string[]
  error: string
  color?: string
  onPick: (value: string) => void
  onDismissAll: () => void
}) {
  if (error) {
    return (
      <p className="text-[11px] mt-2" style={{ color: 'var(--accent)' }}>
        {error}
      </p>
    )
  }

  if (suggestions.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
          Sugerencias — tocá para añadir
        </p>
        <button
          type="button"
          onClick={onDismissAll}
          className="text-[10px] hover:opacity-80 cursor-pointer"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Descartar
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'transparent',
              color,
              border: `1px dashed color-mix(in srgb, ${color} 55%, transparent)`,
            }}
          >
            <Sparkles size={9} style={{ opacity: 0.7 }} />
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Single-value variant: for the promesa suggestion. */
export function GhostSuggestionLine({
  suggestions,
  error,
  color = 'var(--accent)',
  onPick,
  onDismissAll,
}: {
  suggestions: string[]
  error: string
  color?: string
  onPick: (value: string) => void
  onDismissAll: () => void
}) {
  if (error) {
    return (
      <p className="text-[11px] mt-2" style={{ color: 'var(--accent)' }}>
        {error}
      </p>
    )
  }

  if (suggestions.length === 0) return null

  return (
    <div className="mt-2 space-y-1.5">
      {suggestions.map((s) => (
        <div
          key={s}
          className="flex items-start gap-2 rounded-lg px-3 py-2"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
            border: `1px dashed color-mix(in srgb, ${color} 45%, transparent)`,
          }}
        >
          <button
            type="button"
            onClick={() => onPick(s)}
            className="flex-1 text-left text-xs cursor-pointer"
            style={{ color: 'var(--foreground)' }}
          >
            <span className="font-semibold" style={{ color }}>Usar: </span>
            {s}
          </button>
          <button
            type="button"
            onClick={onDismissAll}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label="Descartar sugerencia"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
