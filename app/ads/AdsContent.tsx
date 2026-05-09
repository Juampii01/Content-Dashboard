'use client'

import { Megaphone } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { ComingSoonBanner } from '@/components/shared/ComingSoonBanner'

/**
 * /ads — placeholder hasta que las integraciones reales (Meta Marketing API
 * + TikTok Ads Manager API) estén wireadas. Antes mostraba 4 tabs alimentados
 * por `lib/mock-data/ads.ts` que parecía data real → engañoso para el cliente.
 */
export function AdsContent() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Performance"
        title="Ads Dashboard"
        description="Rendimiento centralizado de Meta Ads y TikTok Ads."
        icon={Megaphone}
      />

      <ComingSoonBanner
        title="Ads Dashboard"
        description="Vista unificada de tus campañas de Meta Ads y TikTok Ads, con métricas de spend, ROAS y rendimiento por creativo."
        features={['Meta Ads', 'TikTok Ads', 'ROAS por campaña', 'Análisis de creativos']}
        prerequisite="Requiere conectar las cuentas publicitarias (Meta Business + TikTok Ads Manager)."
      />
    </div>
  )
}
