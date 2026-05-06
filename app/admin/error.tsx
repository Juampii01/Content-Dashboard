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
      title="Error en el panel de administración"
      description="No se pudo cargar el panel. Intenta de nuevo o contacta a un administrador."
      error={error}
      reset={reset}
    />
  )
}
