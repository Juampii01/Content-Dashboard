'use client'

import { useState } from 'react'
import { Users, Telescope, FileText } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { CompetitorList } from '@/components/competidores/CompetitorList'
import { ContentResearchView } from '@/components/content-research/ContentResearchView'
import { TranscriptView } from '@/components/transcript/TranscriptView'
import type { Platform } from '@/components/ui/PlatformBadge'

// ─── Types ───────────────────────────────────────────────────
type MainTab = 'competidores' | 'investigar' | 'transcript'
type PlatformTab = 'youtube' | 'instagram'

// ─── Config ──────────────────────────────────────────────────
const MAIN_TABS: { id: MainTab; label: string; icon: React.ElementType }[] = [
  { id: 'competidores', label: 'Competidores', icon: Users },
  { id: 'investigar', label: 'Investigar Canal', icon: Telescope },
  { id: 'transcript', label: 'Transcript', icon: FileText },
]

const PLATFORM_TABS: { id: PlatformTab; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
]

// ─── Hub ─────────────────────────────────────────────────────
export function InvestigacionHub() {
  const [activeTab, setActiveTab] = useState<MainTab>('competidores')
  const [activePlatform, setActivePlatform] = useState<PlatformTab>('youtube')

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Investigación"
        title="Investigación"
        description="Competidores, canales y transcripciones — todo en un lugar."
        icon={Telescope}
      />

      {/* ── Main tab nav ── */}
      <div
        className="flex items-center gap-1 mb-5 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {MAIN_TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer flex-shrink-0"
              style={{
                color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
              }}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Platform subtabs ── */}
      <div className="flex items-center gap-1 mb-6">
        {PLATFORM_TABS.map(({ id, label }) => {
          const active = activePlatform === id
          return (
            <button
              key={id}
              onClick={() => setActivePlatform(id)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
              style={{
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                  : 'transparent',
                color: active ? 'var(--accent)' : 'var(--muted-foreground)',
                border: active
                  ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)'
                  : '1px solid transparent',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      {activeTab === 'competidores' && (
        activePlatform === 'instagram' ? (
          <CompetitorList platform="instagram" embedded />
        ) : (
          <ComingSoon platform="YouTube" feature="Competidores" />
        )
      )}

      {activeTab === 'investigar' && (
        <ContentResearchView
          platform={activePlatform as Platform}
          embedded
        />
      )}

      {activeTab === 'transcript' && (
        <TranscriptView platform={activePlatform} embedded />
      )}
    </div>
  )
}

// ─── Coming soon placeholder ──────────────────────────────────
function ComingSoon({ platform, feature }: { platform: string; feature: string }) {
  return (
    <div
      className="rounded-2xl p-12 flex flex-col items-center text-center gap-3"
      style={{ backgroundColor: 'var(--card)', border: '1px dashed var(--border)' }}
    >
      <Telescope size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />
      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
        {feature} en {platform} — próximamente
      </p>
      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        Esta funcionalidad estará disponible muy pronto.
      </p>
    </div>
  )
}
