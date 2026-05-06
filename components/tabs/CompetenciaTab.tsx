'use client'

import { COMPETITORS } from '@/lib/mock-data/competencia'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { TrendingUp } from 'lucide-react'

export function CompetenciaTab() {
  return (
    <div>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Cuenta', 'Seguidores', 'Crecimiento', 'Eng. Rate', 'Posts/sem', 'Avg Views', 'Avg Likes'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold tracking-wide uppercase"
                  style={{ color: 'var(--muted-foreground)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPETITORS.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < COMPETITORS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                      {c.username[1].toUpperCase()}
                    </div>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>{c.username}</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-semibold" style={{ color: 'var(--foreground)' }}>{formatK(c.followers)}</td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#8A7A4A' }}>
                    <TrendingUp size={12} />+{c.followersChange}%
                  </span>
                </td>
                <td className="px-5 py-4 font-semibold" style={{ color: '#B08A4A' }}>{formatPercent(c.engagementRate)}</td>
                <td className="px-5 py-4" style={{ color: 'var(--foreground)' }}>{c.postsPerWeek}</td>
                <td className="px-5 py-4" style={{ color: 'var(--foreground)' }}>{formatK(c.avgViews)}</td>
                <td className="px-5 py-4" style={{ color: 'var(--foreground)' }}>{formatK(c.avgLikes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
