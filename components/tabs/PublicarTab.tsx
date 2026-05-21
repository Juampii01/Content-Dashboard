'use client'

import { Send } from 'lucide-react'
import { ComingSoonTab } from './ComingSoonTab'

export function PublicarTab() {
  return (
    <ComingSoonTab
      icon={Send}
      title="Publicar contenido"
      description="Creá, programá y publicá posts, reels e historias directamente desde el dashboard sin salir de la plataforma."
      features={[
        'Programación de posts y reels',
        'Editor de captions con IA',
        'Calendario de contenido',
        'Publicación en múltiples cuentas',
        'Vista previa antes de publicar',
        'Hashtag suggestions',
      ]}
    />
  )
}
