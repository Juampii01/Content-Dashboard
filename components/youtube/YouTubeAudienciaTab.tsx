'use client'

import { Users, Globe2, Loader2 } from 'lucide-react'
import { youtubeMockDemographics } from '@/lib/mock-data/youtube'
import { useYouTubeDemographics } from '@/hooks/useYouTubeData'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'

interface Props {
  connected: boolean
}

export function YouTubeAudienciaTab({ connected }: Props) {
  const { data, loading } = useYouTubeDemographics(connected)

  const hasReal = data?.available === true && (
    data.ageGroups.length > 0 || data.gender.length > 0 || data.topCountries.length > 0
  )

  const ageGroups = hasReal ? data!.ageGroups : youtubeMockDemographics.ageGroups
  const gender    = hasReal ? data!.gender    : youtubeMockDemographics.gender
  const topCountries = hasReal ? data!.topCountries : youtubeMockDemographics.topCountries

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!hasReal && (
        <div className="flex items-center justify-end">
          <DemoDataPill />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Age groups */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} style={{ color: 'var(--muted-foreground)' }} />
            <p
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Edad
            </p>
          </div>
          <div className="space-y-3">
            {ageGroups.map((a) => (
              <div key={a.range} className="flex items-center gap-3">
                <span className="text-sm w-16 tabular-nums" style={{ color: 'var(--foreground)' }}>
                  {a.range}
                </span>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${a.percent}%`, backgroundColor: 'var(--accent)' }}
                  />
                </div>
                <span
                  className="text-sm w-10 text-right tabular-nums"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {a.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} style={{ color: 'var(--muted-foreground)' }} />
            <p
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Género
            </p>
          </div>
          <div className="space-y-3">
            {gender.map((g) => (
              <div key={g.label} className="flex items-center gap-3">
                <span className="text-sm w-24" style={{ color: 'var(--foreground)' }}>
                  {g.label}
                </span>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${g.percent}%`, backgroundColor: 'var(--accent)' }}
                  />
                </div>
                <span
                  className="text-sm w-10 text-right tabular-nums"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {g.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top countries */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe2 size={16} style={{ color: 'var(--muted-foreground)' }} />
          <p
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Países top
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {topCountries.map((c) => (
            <div key={c.country} className="flex items-center gap-3">
              <span
                className="text-sm w-32 truncate"
                style={{ color: 'var(--foreground)' }}
              >
                {c.country}
              </span>
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--muted)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.percent}%`, backgroundColor: 'var(--accent)' }}
                />
              </div>
              <span
                className="text-sm w-10 text-right tabular-nums"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {c.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {!hasReal && connected && (
        <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
          Para ver datos reales, reconecta YouTube — necesitamos el permiso de YouTube Analytics.
        </p>
      )}
    </div>
  )
}
