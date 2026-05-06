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
      title="Error al cargar el login"
      description="La página de acceso no está disponible. Recarga en unos segundos."
      error={error}
      reset={reset}
    />
  )
}
