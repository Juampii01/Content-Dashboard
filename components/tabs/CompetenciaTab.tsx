'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { formatK } from '@/lib/utils/formatters'
import type { CompetitorDTO } from '@/lib/types/competidores'
import Link from 'next/link'

export function CompetenciaTab() {
  const [competitors, setCompetitors] = useState<CompetitorDTO[] | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/competitors')
      if (res.ok) {
        const data = (await res.json()) as { competitors: CompetitorDTO[] }
        setCompetitors(data.competitors)
      }
    } catch {
      // keep null state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl p-5 space-y-4 animate-pulse" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: 'var(--muted)' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 rounded" style={{ backgroundColor: 'var(--muted)' }} />
                <div className="h-2.5 w-24 rounded" style={{ backgroundColor: 'var(--muted)' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="h-2.5 w-16 rounded" style={{ backgroundColor: 'var(--muted)' }} />
                <div className="flex flex-wrap gap-1.5">
                  {[70, 90, 60].map((w, j) => (
                    <div key={j} className="h-5 rounded-full" style={{ width: w, backgroundColor: 'var(--muted)' }} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 w-16 rounded" style={{ backgroundColor: 'var(--muted)' }} />
                <div className="flex flex-wrap gap-1.5">
                  {[80, 55, 75].map((w, j) => (
                    <div key={j} className="h-5 rounded-full" style={{ width: w, backgroundColor: 'var(--muted)' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="h-8 w-full rounded-lg" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
        ))}
      </div>
    )
  }

  if (!competitors || competitors.length === 0) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--muted)' }}
        >
          <Users size={20} style={{ color: 'var(--muted-foreground)' }} />
        </div>
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
            Sin competidores añadidos
          </p>
          <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Añade competidores desde la sección Competidores para verlos aquí.
          </p>
          <Link
            href="/competidores"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            Ir a Competidores →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Cuenta', 'Seguidores', 'Reels', 'Último scrape', ''].map(h => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-semibold tracking-wide uppercase"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competitors.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < competitors.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {c.profilePicUrl ? (
                      <img src={c.profilePicUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                      >
                        {c.username[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>@{c.username}</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-semibold" style={{ color: 'var(--foreground)' }}>
                  {c.followersCount != null ? formatK(c.followersCount) : '—'}
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--foreground)' }}>
                  {c.reelsCount ?? 0}
                </td>
                <td className="px-5 py-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {c.lastScrapedAt
                    ? new Date(c.lastScrapedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Pendiente'}
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/competidores/${c.username}`}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Ver detalle →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
