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
      title="Error al cargar Eternity AI"
      description="No pudimos cargar tus conversaciones. Intenta de nuevo."
      error={error}
      reset={reset}
    />
  )
}
