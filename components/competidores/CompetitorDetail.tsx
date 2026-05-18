'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Trash2, Users, Loader2, AlertCircle, RefreshCcw, ChevronLeft, Film, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { ReelGrid } from '@/components/competidores/ReelGrid'
import { SortControls } from '@/components/competidores/SortControls'
import { ScrapeProgressDialog } from '@/components/competidores/ScrapeProgressDialog'
import { DeleteCompetitorDialog } from '@/components/competidores/DeleteCompetitorDialog'
import { ReelDetailDrawer } from '@/components/competidores/ReelDetailDrawer'
import type {
  CompetitorDTO,
  ReelDTO,
  GetCompetitorResponse,
  RefreshCompetitorResponse,
  ReelSortField,
  ReelSortDir,
} from '@/lib/types/competidores'
import { DEFAULT_SORT } from '@/lib/types/competidores'
import { addActive } from '@/lib/competidores/active-jobs'

interface Props {
  username: string
}

async function fetchCompetitorDetail(username: string, signal?: AbortSignal): Promise<{ competitor: CompetitorDTO; reels: ReelDTO[] }> {
  // GET /api/competitors/[id] accepts either a CUID or a username — A1's route
  // detects the format and resolves accordingly, so we can hit it directly.
  const detailRes = await fetch(`/api/competitors/${encodeURIComponent(username)}`, {
    credentials: 'same-origin',
    signal,
  })
  if (!detailRes.ok) {
    const body = (await detailRes.json()) as { error?: string }
    throw new Error(body.error ?? `Error ${detailRes.status}`)
  }
  const detailData = (await detailRes.json()) as GetCompetitorResponse
  return { competitor: detailData.competitor, reels: detailData.reels }
}

function sortReels(reels: ReelDTO[], field: ReelSortField, dir: ReelSortDir): ReelDTO[] {
  return [...reels].sort((a, b) => {
    let va: number
    let vb: number
    if (field === 'views')    { va = a.viewsCount;    vb = b.viewsCount }
    else if (field === 'likes')    { va = a.likesCount;    vb = b.likesCount }
    else if (field === 'comments') { va = a.commentsCount; vb = b.commentsCount }
    else {
      // postedAt
      va = a.postedAt ? new Date(a.postedAt).getTime() : 0
      vb = b.postedAt ? new Date(b.postedAt).getTime() : 0
    }
    return dir === 'desc' ? vb - va : va - vb
  })
}

function InitialsAvatar({ username }: { username: string }) {
  return (
    <div
      className="flex items-center justify-center w-14 h-14 rounded-full text-xl font-semibold flex-shrink-0"
      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  )
}

export function CompetitorDetail({ username }: Props) {
  const router = useRouter()
  const [competitor, setCompetitor] = useState<CompetitorDTO | null>(null)
  const [reels, setReels] = useState<ReelDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<ReelSortField>(DEFAULT_SORT.field)
  const [sortDir, setSortDir] = useState<ReelSortDir>(DEFAULT_SORT.dir)

  // Refresh scrape job
  const [refreshJobId, setRefreshJobId] = useState<string | null>(null)
  const [refreshProgressOpen, setRefreshProgressOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshRequestedCount, setRefreshRequestedCount] = useState<number>(30)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Drawer state — wired below at <ReelDetailDrawer />, opened from ReelGrid clicks.
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null)

  const loadDetailAbortRef = useRef<AbortController | null>(null)

  const loadDetail = useCallback(async () => {
    loadDetailAbortRef.current?.abort()
    const controller = new AbortController()
    loadDetailAbortRef.current = controller
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchCompetitorDetail(username, controller.signal)
      if (controller.signal.aborted) return
      setCompetitor(data.competitor)
      setReels(data.reels)
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Error al cargar competidor'
      toast.error(msg)
      setLoadError(msg)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [username])

  useEffect(() => {
    void loadDetail()
    return () => { loadDetailAbortRef.current?.abort() }
  }, [loadDetail])

  async function handleRefresh() {
    if (!competitor) return
    setRefreshing(true)
    try {
      const res = await fetch(`/api/competitors/${competitor.id}/refresh`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      const data = (await res.json()) as RefreshCompetitorResponse
      setRefreshJobId(data.jobId)
      setRefreshRequestedCount(30)
      setRefreshProgressOpen(true)
      // Persist job so it can be resumed if the tab is closed
      addActive({ jobId: data.jobId, username: competitor.username, requestedCount: 30, kind: 'refresh', startedAt: new Date().toISOString() })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al refrescar')
    } finally {
      setRefreshing(false)
    }
  }

  function handleSortChange(field: ReelSortField, dir: ReelSortDir) {
    setSortField(field)
    setSortDir(dir)
  }

  function handleRefreshProgressClose() {
    setRefreshProgressOpen(false)
    void loadDetail()
  }

  const sortedReels = sortReels(reels, sortField, sortDir)

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div
          className="mb-6 rounded-2xl p-5 flex items-center gap-4 animate-pulse"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="rounded-full flex-shrink-0" style={{ background: 'var(--muted)', width: 56, height: 56 }} />
          <div className="flex flex-col gap-2 flex-1">
            <div className="rounded-lg" style={{ background: 'var(--muted)', height: 20, width: '30%' }} />
            <div className="rounded-lg" style={{ background: 'var(--muted)', height: 14, width: '20%' }} />
          </div>
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl"
              style={{ background: 'var(--muted)', aspectRatio: '9/16', border: '1px solid var(--border)' }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (loadError && !competitor) {
    return (
      <div className="max-w-6xl mx-auto py-24 flex flex-col items-center gap-4 text-center">
        <AlertCircle size={28} style={{ color: 'var(--destructive)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Error al cargar el competidor
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {loadError}
          </p>
        </div>
        <button
          onClick={() => void loadDetail()}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
        >
          <RefreshCcw size={13} />
          Reintentar
        </button>
      </div>
    )
  }

  if (!competitor) {
    return (
      <div className="max-w-6xl mx-auto py-24 text-center" style={{ color: 'var(--muted-foreground)' }}>
        <p className="text-sm">Competidor @{username} no encontrado.</p>
        <button
          onClick={() => router.push('/competidores')}
          className="mt-4 text-sm underline"
          style={{ color: 'var(--accent)' }}
        >
          Volver a la lista
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/competidores')}
        className="flex items-center gap-1.5 mb-4 text-xs font-medium transition-all hover:opacity-70"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <ChevronLeft size={14} />
        Competidores
      </button>

      {/* Header */}
      <header
        className="mb-6 rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Accent band */}
        <div className="h-1.5 w-full" style={{ background: 'var(--gradient-accent)' }} />

        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {competitor.profilePicUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={competitor.profilePicUrl}
                alt={`Avatar de @${competitor.username}`}
                className="w-16 h-16 rounded-2xl object-cover ring-2"
                style={{ ['--tw-ring-color' as string]: 'var(--border)' }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
                style={{ background: 'var(--gradient-accent)', color: 'var(--accent-foreground)' }}
              >
                {competitor.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                @{competitor.username}
              </h1>
              <a
                href={`https://www.instagram.com/${competitor.username}/`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium transition-all hover:opacity-70"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
              >
                <ExternalLink size={9} />
                IG
              </a>
            </div>
            {competitor.displayName && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {competitor.displayName}
              </p>
            )}
            {/* Stat chips */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {competitor.followersCount != null && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                >
                  <Users size={11} style={{ color: 'var(--muted-foreground)' }} />
                  {competitor.followersCount.toLocaleString('es-ES')} seguidores
                </span>
              )}
              <span
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                <Film size={11} style={{ color: 'var(--muted-foreground)' }} />
                {reels.length} reels
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refrescar reels"
              className="btn btn-secondary text-xs"
            >
              {refreshing
                ? <Loader2 size={13} className="animate-spin" />
                : <RefreshCw size={13} />}
              Refrescar
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              aria-label="Eliminar competidor"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
                color: 'var(--destructive)',
                border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)',
              }}
            >
              <Trash2 size={13} />
              Borrar
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar: sort controls */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
          Ordenar por
        </p>
        <SortControls field={sortField} dir={sortDir} onChange={handleSortChange} />
      </div>

      {/* Reel grid */}
      <ReelGrid reels={sortedReels} onOpenDrawer={setSelectedReelId} />

      {/* Reel detail drawer */}
      <ReelDetailDrawer
        reelId={selectedReelId}
        onClose={() => setSelectedReelId(null)}
      />

      {/* Refresh progress dialog */}
      {refreshProgressOpen && competitor && refreshJobId && (
        <ScrapeProgressDialog
          open={refreshProgressOpen}
          jobId={refreshJobId}
          username={competitor.username}
          requestedCount={refreshRequestedCount as 10 | 20 | 30}
          onClose={handleRefreshProgressClose}
        />
      )}

      {/* Delete dialog */}
      {competitor && (
        <DeleteCompetitorDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          competitorId={competitor.id}
          username={competitor.username}
          reelsCount={reels.length}
        />
      )}
    </div>
  )
}
