'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Shared error boundary UI used by every route-level `error.tsx`.
 *
 * Consistent structure: icon + title + description + retry + home buttons +
 * optional digest for Vercel log correlation. Keeps surface homogeneous so
 * users recognize "this is an error card" instead of random fallbacks.
 */
export function ErrorBoundaryCard({
  title,
  description,
  error,
  reset,
  showHome = true,
}: {
  title: string
  description?: string
  error: Error & { digest?: string }
  reset: () => void
  showHome?: boolean
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') console.error('[ErrorBoundary]', title, error)
  }, [error, title])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
          color: 'var(--accent)',
        }}
      >
        <AlertTriangle size={24} />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
          {title}
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {description ?? 'Ocurrió un error inesperado. Intenta de nuevo o vuelve al inicio.'}
        </p>
        {error.digest && (
          <p className="text-xs" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
            ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-foreground)',
          }}
        >
          <RefreshCw size={14} />
          Reintentar
        </button>
        {showHome && (
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            <Home size={14} />
            Inicio
          </Link>
        )}
      </div>
    </div>
  )
}
