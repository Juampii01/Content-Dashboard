'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'

export function AIInsightWidget() {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/me/ai-insight', { method: 'POST' })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? 'Error al generar el insight')
        return
      }
      const data = (await res.json()) as { insight: string | null }
      if (data.insight) {
        setInsight(data.insight)
      } else {
        setError('No hay suficientes datos para generar un insight aún.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        borderRadius: '1rem',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--accent)',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sparkles
          size={16}
          style={{ color: 'var(--accent)', flexShrink: 0 }}
          aria-hidden="true"
        />
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--muted-foreground)',
          }}
        >
          Insight IA
        </span>
      </div>

      {insight ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p
            style={{
              fontSize: '0.875rem',
              lineHeight: '1.5',
              color: 'var(--foreground)',
              margin: 0,
            }}
          >
            {insight}
          </p>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 150ms ease',
            }}
          >
            {loading ? (
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
            ) : (
              <RefreshCw size={12} aria-hidden="true" />
            )}
            Regenerar
          </button>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--muted-foreground)',
              margin: 0,
            }}
          >
            {error}
          </p>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
            ) : null}
            Reintentar
          </button>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-foreground)',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 150ms ease',
          }}
        >
          {loading ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
          ) : (
            <Sparkles size={14} aria-hidden="true" />
          )}
          {loading ? 'Generando...' : 'Generar insight ✨'}
        </button>
      )}
    </div>
  )
}
