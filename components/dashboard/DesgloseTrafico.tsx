'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  organic: number
  paid: number
}

export function DesgloseTrafico({ organic, paid }: Props) {
  const data = [
    { name: 'Orgánico', value: organic },
    { name: 'Pagado', value: paid },
  ]
  const COLORS = ['var(--accent)', '#B08A4A']

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>DESGLOSE DE TRÁFICO</p>
      </div>
      <div className="flex items-center gap-4">
        <div style={{ height: 90, width: 90 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={42} dataKey="value" strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1 text-xs">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
              <span style={{ color: 'var(--muted-foreground)' }}>{d.name}</span>
              <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
