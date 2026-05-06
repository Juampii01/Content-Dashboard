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
      title="Error al cargar Ads"
      description="No pudimos obtener los datos del panel de anuncios. Intenta de nuevo."
      error={error}
      reset={reset}
    />
  )
}
