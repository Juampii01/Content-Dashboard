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
      title="Error al cargar TikTok"
      description="No pudimos obtener los datos de TikTok. Intenta de nuevo."
      error={error}
      reset={reset}
    />
  )
}
