'use client'

import { MessageSquare } from 'lucide-react'
import { ComingSoonTab } from './ComingSoonTab'

export function ComentariosTab() {
  return (
    <ComingSoonTab
      icon={MessageSquare}
      title="Gestión de comentarios"
      description="Respondé, moderá y analizá todos los comentarios de tus posts y reels desde un solo lugar."
      features={[
        'Bandeja unificada de comentarios',
        'Respuestas rápidas con IA',
        'Filtros por sentiment',
        'Ocultar y eliminar comentarios',
        'Métricas de engagement',
        'Alertas de menciones',
      ]}
    />
  )
}
