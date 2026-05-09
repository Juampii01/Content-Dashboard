'use client'

import { Music } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { ComingSoonBanner } from '@/components/shared/ComingSoonBanner'

/**
 * /tiktok — placeholder hasta que la TikTok Display API esté wireada.
 * Antes mostraba 4 tabs (Dashboard / Videos / Tendencias / Audiencia)
 * alimentados por `lib/mock-data/tiktok.ts` que parecía data real → no
 * shippeable a un cliente. ConnectButton para TikTok queda desactivado
 * hasta que el flujo OAuth + sync esté implementado.
 */
export function TikTokContent() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Redes sociales"
        title="TikTok Analytics"
        description="Análisis de rendimiento y crecimiento en TikTok."
        icon={Music}
      />

      <ComingSoonBanner
        title="TikTok Analytics"
        description="Métricas detalladas de tu cuenta de TikTok: videos top, tendencias, demografía y crecimiento."
        features={['Videos top', 'Tendencias', 'Demografía', 'Crecimiento']}
        prerequisite="Conectá tu cuenta de TikTok desde la sección de integraciones."
      />
    </div>
  )
}
