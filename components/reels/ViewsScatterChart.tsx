'use client'

import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { useRouter } from 'next/navigation'
import type { Reel } from '@/lib/types'
import { getScatterColor } from '@/lib/utils/multiplier'
import { formatK } from '@/lib/utils/formatters'

interface Props {
  reels: Reel[]
  avgViews: number
}

export function ViewsScatterChart({ reels, avgViews }: Props) {
  const router = useRouter()

  const data = reels.map((r, i) => ({
    x: i,
    y: r.views,
    id: r.id,
    multiplier: r.multiplier,
    label: r.caption.slice(0, 30),
  }))

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>VIEWS POR REEL</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Cada punto es un reel · click para verlo · línea = promedio
          </p>
        </div>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>promedio: {formatK(avgViews)} views</span>
      </div>

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="x" hide />
            <YAxis dataKey="y" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatK} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--border)' }}
              contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
              formatter={(val: unknown) => [formatK(val as number), 'Views']}
            />
            <ReferenceLine y={avgViews} stroke="#9A8F89" strokeDasharray="4 4" strokeWidth={1} />
            <Scatter
              data={data}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(d: any) => d?.id && router.push(`/instagram/reels/${d.id}`)}
              style={{ cursor: 'pointer' }}>
              {data.map((d, i) => (
                <Cell key={i} fill={getScatterColor(d.multiplier)} r={d.multiplier >= 8 ? 10 : d.multiplier >= 5 ? 8 : d.multiplier >= 3 ? 7 : 5} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
        {[
          { color: '#6E2A35', label: 'Normal' },
          { color: '#A63A4B', label: '×3+' },
          { color: 'var(--accent)', label: '×5+' },
          { color: '#B08A4A', label: '×8+ outlier' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-4 border-t border-dashed" style={{ borderColor: 'var(--muted-foreground)' }} />
          promedio
        </span>
      </div>
    </div>
  )
}
