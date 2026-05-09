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
      // Re-open the most recent active job
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
    // Refresh list after the add flow closes (job may still be running;
    // the ScrapeProgressDialog will have already navigated away on completion,
    // but if it failed we refresh to reflect any partial state).
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
          <button
            onClick={() => setAddOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={15} />
            Agregar competidor
          </button>
        }
      />
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
      {!loading && competitors.length === 0 && (
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
