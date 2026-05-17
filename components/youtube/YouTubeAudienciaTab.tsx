'use client'

/**
 * YouTubeAudienciaTab
 *
 * Demographics (age / gender / country) require the YouTube Analytics API
 * with the `yt-analytics.readonly` scope — separate from the `youtube.readonly`
 * scope used in the current sync flow. Until that scope is added and approved
 * in Google Cloud, this tab shows an honest placeholder instead of fake data.
 */

import { Users, Globe2, BarChart3 } from 'lucide-react'

function ComingSoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div
      className="rounded-xl p-6 flex flex-col items-center gap-3 text-center"
      style={{ backgroundColor: 'var(--card)', border: '1px dashed var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <Icon size={18} style={{ color: 'var(--muted-foreground)' }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
        {title}
      </p>
      <p className="text-xs max-w-xs" style={{ color: 'var(--muted-foreground)' }}>
        {description}
      </p>
    </div>
  )
}

export function YouTubeAudienciaTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComingSoonCard
          icon={Users}
          title="Distribución por edad"
          description="Requiere habilitar YouTube Analytics API (yt-analytics.readonly) en Google Cloud y reconectar la cuenta."
        />
        <ComingSoonCard
          icon={Users}
          title="Distribución por género"
          description="Requiere YouTube Analytics API. Los datos de género no están disponibles con el scope youtube.readonly actual."
        />
      </div>

      <ComingSoonCard
        icon={Globe2}
        title="Países top"
        description="La distribución geográfica de la audiencia también requiere YouTube Analytics API."
      />

      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
      >
        <BarChart3 size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0, marginTop: 2 }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          Para activar demografía real, habilitá <strong style={{ color: 'var(--foreground)' }}>YouTube Analytics API</strong> en tu
          proyecto de Google Cloud, agregá el scope <code>yt-analytics.readonly</code> al OAuth y reconectá la cuenta desde{' '}
          <strong style={{ color: 'var(--foreground)' }}>/youtube</strong>.
        </p>
      </div>
    </div>
  )
}
