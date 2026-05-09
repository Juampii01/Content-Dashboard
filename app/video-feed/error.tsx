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
      title="No pudimos cargar Video Feed"
      description="No fue posible obtener tu feed. Probá actualizar; si el problema persiste, avisá al equipo."
      error={error}
      reset={reset}
    />
  )
}
