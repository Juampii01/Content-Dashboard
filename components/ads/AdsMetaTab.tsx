'use client'

import { META_CAMPAIGNS } from '@/lib/mock-data/ads'
import { CampaignTable } from './CampaignTable'
import { formatK, formatPercent } from '@/lib/utils/formatters'

const activeCampaigns = META_CAMPAIGNS.filter(c => c.status === 'activa')
const totalSpend = META_CAMPAIGNS.reduce((sum, c) => sum + c.spent, 0)
const totalReach  = META_CAMPAIGNS.reduce((sum, c) => sum + c.reach, 0)
const avgCTR = META_CAMPAIGNS.reduce((sum, c) => sum + c.ctr, 0) / META_CAMPAIGNS.length
const avgROAS = META_CAMPAIGNS.reduce((sum, c) => sum + c.roas, 0) / META_CAMPAIGNS.length

export function AdsMetaTab() {
  return (
    <div className="space-y-5">
      {/* Summary chips */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: 'Campañas activas', value: String(activeCampaigns.length) },
          { label: 'Gasto total', value: `$${formatK(totalSpend)}` },
          { label: 'Alcance total', value: formatK(totalReach) },
          { label: 'CTR promedio', value: formatPercent(avgCTR) },
          { label: 'ROAS promedio', value: `×${avgROAS.toFixed(1)}` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <span style={{ color: 'var(--muted-foreground)' }}>{label}:</span>
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <CampaignTable campaigns={META_CAMPAIGNS} />
    </div>
  )
}
