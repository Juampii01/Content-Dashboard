'use client'

import { Inbox } from 'lucide-react'
import { ComingSoonTab } from './ComingSoonTab'

export function MensajesTab() {
  return (
    <ComingSoonTab
      icon={Inbox}
      title="Mensajes directos"
      description="Gestioná tu inbox de DMs de Instagram con respuestas automáticas, etiquetas y seguimiento de conversaciones."
      features={[
        'Inbox unificado de DMs',
        'Respuestas automáticas con IA',
        'Etiquetas y categorías',
        'Seguimiento de leads',
        'Plantillas de respuesta',
        'Métricas de tiempo de respuesta',
      ]}
    />
  )
}
