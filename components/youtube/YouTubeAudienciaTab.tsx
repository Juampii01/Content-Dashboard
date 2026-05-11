'use client'

/**
 * YouTube demographics (age / gender / country) renderizados con mock data
 * mientras la YouTube Analytics API real no está integrada (scope distinto
 * al Data API v3 usado en /api/youtube/sync). Cuando el cliente conecte
 * Analytics API, este tab consumirá datos reales en vez del mock.
 */

import { Users, Globe2 } from 'lucide-react'
import { youtubeMockDemographics } from '@/lib/mock-data/youtube'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'

export function YouTubeAudienciaTab() {
  const { ageGroups, gender, topCountries } = youtubeMockDemographics

  return (
    <div className="space-y-6">
      <div><DemoDataPill /></div>
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
                <span
                  className="text-sm w-16 tabular-nums"
                  style={{ color: 'var(--foreground)' }}
                >
                  {a.range}
                </span>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${a.percent}%`,
                      backgroundColor: 'var(--accent)',
                    }}
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
                <span
                  className="text-sm w-24"
                  style={{ color: 'var(--foreground)' }}
                >
                  {g.label}
                </span>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${g.percent}%`,
                      backgroundColor: 'var(--accent)',
                    }}
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
                  style={{
                    width: `${c.percent}%`,
                    backgroundColor: 'var(--accent)',
                  }}
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

      <p
        className="text-xs text-center"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Demografía en modo demo — se activará con datos reales cuando se integre YouTube Analytics API.
      </p>
    </div>
  )
}
