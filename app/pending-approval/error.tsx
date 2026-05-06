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
      title="Error en pending approval"
      description="No pudimos verificar el estado de tu cuenta. Recarga la página."
      error={error}
      reset={reset}
    />
  )
}
