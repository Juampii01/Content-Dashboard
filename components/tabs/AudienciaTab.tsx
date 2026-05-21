'use client'

import { Users } from 'lucide-react'
import { ComingSoonTab } from './ComingSoonTab'

export function AudienciaTab() {
  return (
    <ComingSoonTab
      icon={Users}
      title="Audiencia y seguidores"
      description="Conocé en profundidad a tu audiencia: demografía, intereses, horarios de actividad y evolución de seguidores."
      features={[
        'Demografía detallada',
        'Países y ciudades top',
        'Horarios de mayor actividad',
        'Crecimiento de seguidores',
        'Perfil de intereses',
        'Segmentación de audiencia',
      ]}
    />
  )
}
