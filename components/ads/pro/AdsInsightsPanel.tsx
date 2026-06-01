'use client'

import { Trophy, AlertTriangle, Activity } from 'lucide-react'
import { type AdCampaignRow } from '@/hooks/useAdsData'
import { META_BLUE } from './ads-theme'

interface AdsInsightsPanelProps {
  campaigns: AdCampaignRow[]
}

export function AdsInsightsPanel({ campaigns }: AdsInsightsPanelProps) {
  if (!campaigns.length) return null

  // Best performing by ROAS
  const bestRoas = campaigns
    .filter((c) => c.roas > 0)
    .sort((a, b) => b.roas - a.roas)[0] ?? null

  // Worst CTR
  const worstCtr = campaigns
    .filter((c) => c.impressions > 0)
    .sort((a, b) => a.ctr - b.ctr)[0] ?? null

  // Active campaign health
  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE')
  const activePct = campaigns.length > 0 ? Math.round((activeCampaigns.length / campaigns.length) * 100) : 0

  const insights: { icon: React.ElementType; color: string; bg: string; title: string; subtitle: string }[] = []

  if (bestRoas) {
    insights.push({
      icon: Trophy,
      color: '#22c55e',
      bg: '#22c55e12',
      title: `Mejor ROAS: ${bestRoas.roas.toFixed(2)}x`,
      subtitle: bestRoas.name || '(Sin nombre)',
    })
  }

  if (worstCtr) {
    const isLow = worstCtr.ctr < 1
    insights.push({
      icon: AlertTriangle,
      color: isLow ? '#ef4444' : '#f59e0b',
      bg: isLow ? '#ef444412' : '#f59e0b12',
      title: `CTR más bajo: ${worstCtr.ctr.toFixed(2)}%`,
      subtitle: worstCtr.name || '(Sin nombre)',
    })
  }

  insights.push({
    icon: Activity,
    color: META_BLUE,
    bg: `${META_BLUE}12`,
    title: `${activePct}% campañas activas`,
    subtitle: `${activeCampaigns.length} de ${campaigns.length} campaña${campaigns.length === 1 ? '' : 's'} activa${activeCampaigns.length === 1 ? '' : 's'}`,
  })

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
        Insights de campañas
      </p>

      <div className="space-y-3">
        {insights.map(({ icon: Icon, color, bg, title, subtitle }) => (
          <div key={title} className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: bg }}
            >
              <Icon size={14} style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {title}
              </p>
              <p className="text-xs truncate max-w-[260px]" style={{ color: 'var(--muted-foreground)' }}>
                {subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
