'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Error al cargar el analizador
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          No se pudieron cargar los datos de análisis. Intenta de nuevo o vuelve al inicio.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60">ID: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => unstable_retry()}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
