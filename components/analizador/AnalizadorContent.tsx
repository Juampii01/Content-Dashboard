'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { z } from 'zod'
import { Search, Loader2, SortAsc, SortDesc, Clapperboard } from 'lucide-react'
import { ReelAnalyzerCard } from './ReelAnalyzerCard'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'

type SortField = 'views' | 'likes' | 'comments' | 'shares'
type SortDir = 'desc' | 'asc'
type Limit = 30 | 60 | 120

interface ScrapedReel {
  id: string
  url: string
  caption?: string
  transcript?: string
  videoPlayCount?: number
  likesCount?: number
  commentsCount?: number
  sharesCount?: number
  timestamp?: string
  displayUrl?: string
}

// ─── Cache schema ─────────────────────────────────────────────────────────────

const scrapedReelSchema = z.object({
  id: z.string(),
  url: z.string(),
  caption: z.string().optional(),
  transcript: z.string().optional(),
  videoPlayCount: z.number().optional(),
  likesCount: z.number().optional(),
  commentsCount: z.number().optional(),
  sharesCount: z.number().optional(),
  timestamp: z.string().optional(),
  displayUrl: z.string().optional(),
})

const cacheSchema = z.object({
  username: z.string(),
  limit: z.number(),
  reels: z.array(scrapedReelSchema),
  cachedAt: z.number(),
})

const EMPTY_CACHE = { username: '', limit: 30, reels: [] as ScrapedReel[], cachedAt: 0 }
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 min

// ─── Constants ────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'views',    label: 'Vistas' },
  { value: 'likes',    label: 'Likes' },
  { value: 'comments', label: 'Comentarios' },
  { value: 'shares',   label: 'Compartidos' },
]

const LIMIT_OPTIONS: Limit[] = [30, 60, 120]

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalizadorContent() {
  const [username, setUsername] = useState('')
  const [limit, setLimit]       = useState<Limit>(30)
  const [loading, setLoading]   = useState(false)
  const [progress, setProgress] = useState('')
  const [reels, setReels]       = useState<ScrapedReel[]>([])
  const [error, setError]       = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('views')
  const [sortDir, setSortDir]     = useState<SortDir>('desc')
  const [searched, setSearched]   = useState(false)

  const abortRef    = useRef<AbortController | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [cacheData, setCacheData] = useLocalStorage('eternity_analizador_cache', cacheSchema, EMPTY_CACHE)

  // Restore cache on mount (if still fresh)
  useEffect(() => {
    if (cacheData.reels.length > 0 && cacheData.username) {
      const age = Date.now() - cacheData.cachedAt
      if (age < CACHE_TTL_MS) {
        setReels(cacheData.reels)
        setUsername(cacheData.username)
        setLimit(cacheData.limit as Limit)
        setSearched(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = useCallback(async () => {
    const handle = username.trim().replace('@', '')
    if (!handle) return

    // Abort any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)
    setReels([])
    setSearched(true)
    setElapsed(0)
    setProgress(`Iniciando scraping de @${handle}...`)

    // Elapsed timer — shows users the request is alive
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)

    try {
      const res = await fetch('/api/analizador/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: handle, limit }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Error ${res.status}`)
      }

      setProgress('Procesando resultados...')
      const data = await res.json()
      const fetched: ScrapedReel[] = data.reels ?? []
      setReels(fetched)
      setCacheData({ username: handle, limit, reels: fetched, cachedAt: Date.now() })
      setProgress('')
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setProgress('')
    } finally {
      setLoading(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }, [username, limit, setCacheData])

  const sortedReels = [...reels].sort((a, b) => {
    const fieldMap: Record<SortField, keyof ScrapedReel> = {
      views: 'videoPlayCount', likes: 'likesCount', comments: 'commentsCount', shares: 'sharesCount',
    }
    const key = fieldMap[sortField]
    const va = (a[key] as number) ?? 0
    const vb = (b[key] as number) ?? 0
    return sortDir === 'desc' ? vb - va : va - vb
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Analizador</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          Analiza los reels de cualquier cuenta de Instagram y extrae la estructura de sus guiones
        </p>
      </div>

      {/* Search bar */}
      <div
        className="rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--foreground)' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
          />
        </div>

        <div className="flex rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border)' }}>
          {LIMIT_OPTIONS.map((l) => (
            <button key={l} onClick={() => setLimit(l)}
              className="text-xs px-3 py-2.5 font-medium transition-all"
              style={{
                backgroundColor: limit === l ? 'var(--accent)' : 'var(--muted)',
                color: limit === l ? '#fff' : 'var(--muted-foreground)',
              }}
            >
              {l} reels
            </button>
          ))}
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !username.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex-shrink-0"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          {loading ? 'Analizando...' : 'Analizar'}
        </button>
      </div>

      {/* Progress */}
      {progress && (
        <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
              <span>{progress}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                {elapsed}s
              </span>
              <button
                onClick={() => { abortRef.current?.abort(); setLoading(false); setProgress('') }}
                className="text-xs px-2.5 py-1 rounded-lg hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
          {/* Progress bar strip — indeterminate */}
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min((elapsed / 45) * 100, 95)}%`,
                backgroundColor: 'var(--accent)',
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 mb-4 flex items-center justify-between gap-4 text-sm" style={{ backgroundColor: '#E0525218', border: '1px solid #E0525244', color: '#E05252' }}>
          <span>{error}</span>
          <button
            onClick={handleSearch}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: '#E0525233', color: '#E05252', border: '1px solid #E0525266' }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Cache badge */}
      {reels.length > 0 && cacheData.cachedAt > 0 && !loading && (
        <p className="text-[11px] mb-3" style={{ color: 'var(--muted-foreground)' }}>
          Resultados en caché — @{cacheData.username} · {new Date(cacheData.cachedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {/* Results header + sort */}
      {sortedReels.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {sortedReels.length} reels encontrados
          </p>
          <div className="flex items-center gap-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="text-xs px-3 py-1.5 rounded-lg outline-none"
              style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 rounded-lg transition-all hover:opacity-70"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            >
              {sortDir === 'desc'
                ? <SortDesc size={14} style={{ color: 'var(--muted-foreground)' }} />
                : <SortAsc  size={14} style={{ color: 'var(--muted-foreground)' }} />}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {sortedReels.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sortedReels.map((reel, index) => (
            <div
              key={reel.id}
              className="animate-slide-up-fade"
              style={{ animationDelay: `${Math.min(index * 40, 600)}ms`, animationFillMode: 'both' }}
            >
              <ReelAnalyzerCard reel={reel} sortField={sortField} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state — searched but no results */}
      {searched && !loading && reels.length === 0 && !error && (
        <div className="text-center py-16" style={{ color: 'var(--muted-foreground)' }}>
          <Search className="h-10 w-10 mx-auto mb-3 animate-float" />
          <p className="text-sm font-medium">No se encontraron reels</p>
          <p className="text-xs mt-1 opacity-70">Verifica que el usuario sea público y tenga reels</p>
        </div>
      )}

      {/* Initial empty state */}
      {!searched && (
        <div className="text-center py-16" style={{ color: 'var(--muted-foreground)' }}>
          <Clapperboard className="h-10 w-10 mx-auto mb-3 animate-float" />
          <p className="text-sm font-medium">Introduce un @username para empezar</p>
          <p className="text-xs mt-1 opacity-70">Scrapeamos los últimos {limit} reels y extraemos la estructura de cada guión</p>
        </div>
      )}
    </div>
  )
}
