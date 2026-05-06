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
      title="Error al cargar YouTube"
      description="No pudimos obtener los datos del canal. Intenta de nuevo o reconecta YouTube."
      error={error}
      reset={reset}
    />
  )
}
