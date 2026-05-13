'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, RefreshCw } from 'lucide-react'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import type { CompetitorStatDTO } from '@/app/api/instagram/competitors-stats/route'

function SkeletonRow({ delay }: { delay: number }) {
  return (
    <div
      className="animate-pulse rounded h-14 w-full"
      style={{ backgroundColor: 'var(--muted)', animationDelay: `${delay}ms` }}
    />
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl p-10 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Sin competidores</p>
      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        Añadí competidores en{' '}
        <Link href="/competidores" className="underline" style={{ color: 'var(--accent)' }}>/competidores</Link>{' '}
        para ver sus métricas acá.
      </p>
    </div>
  )
}

const HEADERS = ['Cuenta', 'Seguidores', 'Eng. Rate', 'Posts/sem', 'Avg Views', 'Avg Likes']

export function CompetenciaTab() {
  const [competitors, setCompetitors] = useState<CompetitorStatDTO[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/instagram/competitors-stats')
      .then((r) => {
        if (!r.ok) throw new Error('Error al cargar competidores')
        return r.json() as Promise<{ competitors: CompetitorStatDTO[] }>
      })
      .then(({ competitors: data }) => { if (!cancelled) setCompetitors(data) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fetchTrigger])

  const retry = () => {
    setLoading(true)
    setError(null)
    setFetchTrigger((n) => n + 1)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => <SkeletonRow key={i} delay={i * 80} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--muted-foreground)' }}>{error}</p>
        <button
          onClick={retry}
          className="flex items-center gap-2 mx-auto text-xs font-medium px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          <RefreshCw size={12} /> Reintentar
        </button>
      </div>
    )
  }

  if (competitors.length === 0) return <EmptyState />

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {HEADERS.map((h) => (
              <th key={h} className="px-5 py-3 text-left text-xs font-semibold tracking-wide uppercase"
                style={{ color: 'var(--muted-foreground)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {competitors.map((c, i) => (
            <tr key={c.id} style={{ borderBottom: i < competitors.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.profilePicUrl ? (
                    <img src={c.profilePicUrl} alt={c.username} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                      {c.username[1]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div>
                    <span className="font-medium block" style={{ color: 'var(--foreground)' }}>{c.username}</span>
                    {c.displayName && (
                      <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{c.displayName}</span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 font-semibold" style={{ color: 'var(--foreground)' }}>
                {c.followers > 0 ? formatK(c.followers) : '–'}
              </td>
              <td className="px-5 py-4">
                {c.engagementRate > 0 ? (
                  <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--stat-icon)' }}>
                    <TrendingUp size={12} />
                    {formatPercent(c.engagementRate)}
                  </span>
                ) : <span style={{ color: 'var(--muted-foreground)' }}>–</span>}
              </td>
              <td className="px-5 py-4" style={{ color: 'var(--foreground)' }}>
                {c.postsPerWeek > 0 ? c.postsPerWeek : '–'}
              </td>
              <td className="px-5 py-4" style={{ color: 'var(--foreground)' }}>
                {c.avgViews > 0 ? formatK(c.avgViews) : '–'}
              </td>
              <td className="px-5 py-4" style={{ color: 'var(--foreground)' }}>
                {c.avgLikes > 0 ? formatK(c.avgLikes) : '–'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {competitors.some((c) => c.reelsCount === 0) && (
        <p className="px-5 py-3 text-xs" style={{ color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)' }}>
          Los competidores sin reels scrapeados muestran &quot;–&quot;. Hacé refresh desde{' '}
          <Link href="/competidores" className="underline" style={{ color: 'var(--accent)' }}>/competidores</Link>.
        </p>
      )}
    </div>
  )
}
