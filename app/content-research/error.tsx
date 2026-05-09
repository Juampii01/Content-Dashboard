'use client'

import { ErrorBoundaryCard } from '@/components/shared/ErrorBoundaryCard'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorBoundaryCard
      title="No pudimos cargar Content Research"
      description="La búsqueda no terminó bien. Probá de nuevo; si sigue, revisá tu conexión o avisá al equipo."
      error={error}
      reset={reset}
    />
  )
}
