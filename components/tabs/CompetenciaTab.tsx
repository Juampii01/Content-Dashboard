'use client'

import { Users } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

export function CompetenciaTab() {
  return (
    <EmptyState
      icon={Users}
      title="Sin competidores agregados"
      description="Agregá competidores en la sección Investigación → Competidores para ver aquí su comparativa de métricas."
    />
  )
}
