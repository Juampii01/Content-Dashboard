'use client'

import { Users, Eye, Zap, Video, Share2 } from 'lucide-react'
import type { TikTokAccountSummary } from '@/hooks/useTikTokData'
import { fmtTT, TT_TEAL } from './tt-theme'

interface TTOverviewStatsProps {
  summary: TikTokAccountSummary
}

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}

function KpiCard({ icon, label, value, highlight = false }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl p-4 border flex flex-col gap-3 ${
        highlight
          ? 'border-transparent'
          : 'border-border/50 bg-card'
      }`}
      style={
        highlight
          ? {
              background: `linear-gradient(135deg, ${TT_TEAL}15, transparent)`,
              borderColor: `${TT_TEAL}40`,
            }
          : undefined
      }
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          highlight ? '' : 'bg-muted'
        }`}
        style={highlight ? { background: `${TT_TEAL}20` } : undefined}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  )
}

export function TTOverviewStats({ summary }: TTOverviewStatsProps) {
  const snap = summary.latestSnapshot
  const followers = snap?.followers ?? 0
  const totalViews = snap?.totalViews ?? 0
  const er = snap?.engagementRate ?? 0
  const posts = snap?.posts ?? summary.videosCount ?? 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <KpiCard
        icon={<Users className="w-4 h-4" style={{ color: TT_TEAL }} />}
        label="Seguidores"
        value={fmtTT(followers)}
        highlight
      />
      <KpiCard
        icon={<Eye className="w-4 h-4 text-muted-foreground" />}
        label="Views totales"
        value={fmtTT(totalViews)}
      />
      <KpiCard
        icon={<Zap className="w-4 h-4 text-muted-foreground" />}
        label="Engagement Rate"
        value={er > 0 ? er.toFixed(2) + '%' : '—'}
      />
      <KpiCard
        icon={<Video className="w-4 h-4 text-muted-foreground" />}
        label="Videos"
        value={fmtTT(posts)}
      />
      <KpiCard
        icon={<Share2 className="w-4 h-4 text-muted-foreground" />}
        label="Videos sincronizados"
        value={fmtTT(summary.videosCount)}
      />
    </div>
  )
}
