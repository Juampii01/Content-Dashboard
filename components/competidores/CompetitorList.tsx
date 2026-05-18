'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, AlertCircle, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { CompetitorCard } from '@/components/competidores/CompetitorCard'
import { AddCompetitorDialog } from '@/components/competidores/AddCompetitorDialog'
import { ScrapeProgressDialog } from '@/components/competidores/ScrapeProgressDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkeletonCardGrid } from '@/components/ui/LoadingSkeletons'
import type { CompetitorDTO, ListCompetitorsResponse } from '@/lib/types/competidores'
import { readActive, type ActiveJob } from '@/lib/competidores/active-jobs'

type PlatformTab = 'instagram' | 'youtube'

const PLATFORM_TABS: { id: PlatformTab; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
]

async function fetchCompetitors(): Promise<CompetitorDTO[]> {
  const res = await fetch('/api/competitors', { credentials: 'same-origin' })
  if (!res.ok) {
    const body = (await res.json()) as { error?: string }
    throw new Error(body.error ?? `Error ${res.status}`)
  }
  const data = (await res.json()) as ListCompetitorsResponse
  return data.competitors
}

export function CompetitorList() {
  const [activePlatform, setActivePlatform] = useState<PlatformTab>('instagram')
  const [competitors, setCompetitors] = useState<CompetitorDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // Resume active jobs after tab close/reopen
  const [resumedJob, setResumedJob] = useState<ActiveJob | null>(null)

  // On mount, check localStorage for any in-progress jobs
  useEffect(() => {
    const active = readActive()
    if (active.length > 0) {
      setResumedJob(active[active.length - 1])
    }
  }, [])

  const loadCompetitors = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchCompetitors()
      setCompetitors(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar competidores'
      toast.error(msg)
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCompetitors()
  }, [loadCompetitors])

  function handleAddDismiss() {
    void loadCompetitors()
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Inteligencia"
        title="Competidores"
        description="Baúl de competidores. Extraé reels, transcribí y analizá con IA."
        icon={Users}
        actions={
          activePlatform === 'instagram' ? (
            <button
              onClick={() => setAddOpen(true)}
              className="btn btn-primary"
            >
              <Plus size={15} />
              Agregar competidor
            </button>
          ) : null
        }
      />

      {/* Platform tab selector */}
      <div className="flex justify-center mb-2">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          {PLATFORM_TABS.map(({ id, label }) => {
            const isActive = activePlatform === id
            return (
              <button
                key={id}
                onClick={() => setActivePlatform(id)}
                className="relative px-5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                style={{
                  backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Instagram tab ── */}
      {activePlatform === 'instagram' && (
        <>
          {/* Loading skeleton */}
          {loading && <SkeletonCardGrid count={6} cardHeight={120} />}

          {/* Persistent error panel */}
          {!loading && loadError && (
            <div
              className="flex flex-col items-center gap-4 rounded-2xl p-8 text-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--destructive) 25%, transparent)',
              }}
            >
              <AlertCircle size={24} style={{ color: 'var(--destructive)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Error al cargar competidores
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {loadError}
                </p>
              </div>
              <button
                onClick={() => void loadCompetitors()}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                <RefreshCcw size={13} />
                Reintentar
              </button>
            </div>
          )}

          {/* Competitor grid */}
          {!loading && competitors.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {competitors.map((c) => (
                <CompetitorCard key={c.id} competitor={c} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !loadError && competitors.length === 0 && (
            <div
              className="rounded-2xl p-12 flex flex-col items-center text-center gap-4"
              style={{ backgroundColor: 'var(--card)', border: '1px dashed var(--border)' }}
            >
              <Users size={32} style={{ color: 'var(--muted-foreground)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Ningún competidor añadido aún
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Añade un competidor para scrapear sus reels y analizarlos con IA.
                </p>
              </div>
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                <Plus size={14} />
                Añadir primer competidor
              </button>
            </div>
          )}
        </>
      )}

      {/* ── YouTube tab ── */}
      {activePlatform === 'youtube' && (
        <div
          className="rounded-2xl p-12 flex flex-col items-center text-center gap-4"
          style={{ backgroundColor: 'var(--card)', border: '1px dashed var(--border)' }}
        >
          <Users size={32} style={{ color: 'var(--muted-foreground)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Análisis de competidores en YouTube
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Próximamente podrás agregar canales de YouTube y analizar su contenido con IA.
            </p>
          </div>
        </div>
      )}

      {/* Add competitor dialog */}
      <AddCompetitorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDismiss={handleAddDismiss}
      />

      {/* Resume an in-progress job that was running before the tab closed */}
      {resumedJob && (
        <ScrapeProgressDialog
          open={true}
          jobId={resumedJob.jobId}
          username={resumedJob.username}
          requestedCount={resumedJob.requestedCount}
          onClose={() => {
            setResumedJob(null)
            void loadCompetitors()
          }}
        />
      )}
    </div>
  )
}
