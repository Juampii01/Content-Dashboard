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
      title="Error al cargar los clientes"
      description="No pudimos obtener la lista de clientes. Intenta de nuevo."
      error={error}
      reset={reset}
    />
  )
}
