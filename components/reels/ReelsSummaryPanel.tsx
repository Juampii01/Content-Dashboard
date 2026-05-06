'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts'
import type { Reel } from '@/lib/types'
import { formatK } from '@/lib/utils/formatters'
import { Heart, Bookmark, MessageCircle, Share2 } from 'lucide-react'

interface Props {
  reels: Reel[]
}

export function ReelsSummaryPanel({ reels }: Props) {
  const totalViews = reels.reduce((s, r) => s + r.views, 0)
  const avgViews = Math.round(totalViews / (reels.length || 1))
  const totalOrganic = reels.filter(r => r.organicPercent >= 80).length
  const organicPct = Math.round((totalOrganic / reels.length) * 100)
  const paidPct = 100 - organicPct

  const totalLikes = reels.reduce((s, r) => s + r.likes, 0)
  const totalSaves = reels.reduce((s, r) => s + r.saves, 0)
  const totalComments = reels.reduce((s, r) => s + r.comments, 0)
  const totalShares = reels.reduce((s, r) => s + r.shares, 0)

  const donutData = [
    { name: 'Orgánico', value: organicPct },
    { name: 'Pagado', value: paidPct },
  ]
  const COLORS = ['var(--accent)', '#B08A4A']

  // Evolution line — last 10 reels by date
  const evoData = [...reels]
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
    .slice(-10)
    .map(r => ({ date: r.publishedAt.slice(5), views: r.views }))

  // Top 5
  const top5 = [...reels].sort((a, b) => b.views - a.views).slice(0, 5)
  const maxV = top5[0]?.views || 1
  const barColors = ['#B08A4A', 'var(--accent)', '#A63A4B', '#6E2A35', '#9A8F89']

  return (
    <div className="flex flex-col gap-4 min-w-[240px]">

      {/* Resumen donut */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted-foreground)' }}>
          RESUMEN {reels.length} REELS
        </p>
        <div className="flex items-center gap-3">
          <div style={{ height: 80, width: 80, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={25} outerRadius={38} dataKey="value" strokeWidth={0}>
                  {donutData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>{formatK(totalViews)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            {donutData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span style={{ color: 'var(--muted-foreground)' }}>{d.name}</span>
                <span className="font-bold" style={{ color: 'var(--foreground)' }}>{d.value}%</span>
              </div>
            ))}
            <div className="mt-1 text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
              Promedio: <span style={{ color: 'var(--foreground)' }}>{formatK(avgViews)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Evolución de views */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted-foreground)' }}>
          EVOLUCIÓN DE VIEWS
        </p>
        <div style={{ height: 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evoData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 10 }}
                itemStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="views" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Engagement donut */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted-foreground)' }}>ENGAGEMENT</p>
        <div className="flex items-center gap-3">
          <div className="relative" style={{ height: 70, width: 70 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[
                  { value: 2.3 },
                  { value: 97.7 },
                ]} cx="50%" cy="50%" innerRadius={22} outerRadius={33} dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                  <Cell fill="var(--accent)" />
                  <Cell fill="var(--accent)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>2.3%</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}><Heart size={10} /> Likes</span>
              <span style={{ color: 'var(--foreground)' }}>{formatK(totalLikes)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}><Bookmark size={10} /> Guardados</span>
              <span style={{ color: 'var(--foreground)' }}>{formatK(totalSaves)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}><MessageCircle size={10} /> Comentarios</span>
              <span style={{ color: 'var(--foreground)' }}>{formatK(totalComments)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted-foreground)' }}>TOP 5 POR VIEWS</p>
        <div className="flex flex-col gap-2">
          {top5.map((r, i) => (
            <div key={r.id}>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="truncate max-w-[140px]" style={{ color: 'var(--muted-foreground)' }}>{i + 1}. {r.caption.slice(0, 30)}...</span>
                <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{formatK(r.views)}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--accent)' }}>
                <div className="h-full rounded-full" style={{ width: `${(r.views / maxV) * 100}%`, backgroundColor: barColors[i] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted-foreground)' }}>TOTALES DE CONTENIDO</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { icon: <Heart size={12} />, label: 'Likes', val: formatK(totalLikes) },
            { icon: <Bookmark size={12} />, label: 'Guardados', val: formatK(totalSaves) },
            { icon: <MessageCircle size={12} />, label: 'Comentarios', val: formatK(totalComments) },
            { icon: <Share2 size={12} />, label: 'Shares', val: formatK(totalShares) },
          ].map(item => (
            <div key={item.label} className="flex flex-col gap-1">
              <span style={{ color: 'var(--muted-foreground)' }} className="flex items-center gap-1">{item.icon} {item.label}</span>
              <span className="font-bold text-base" style={{ color: 'var(--foreground)' }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
