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
      title="No pudimos cargar Transcript"
      description="Algo falló al renderizar el historial. Intentá refrescar; si persiste, avisá al equipo."
      error={error}
      reset={reset}
    />
  )
}
