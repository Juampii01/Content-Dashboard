'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'
import { TIKTOK_DEMOGRAPHICS } from '@/lib/mock-data/tiktok'
import { usePeriod } from '@/hooks/usePeriod'

const COLORS = ['var(--accent)', '#B08A4A', '#9A8F89']

export function TikTokAudienciaTab() {
  // Period is read so the component re-renders when the filter changes.
  // Demographic data is not time-based, so the charts remain the same.
  usePeriod()

  const { ageData, genderData, countriesData } = TIKTOK_DEMOGRAPHICS

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">

        {/* Edad */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: 'var(--muted-foreground)' }}
          >
            DISTRIBUCIÓN POR EDAD
          </p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <XAxis
                  dataKey="age"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v: unknown) => [`${v}%`, 'Porcentaje']}
                />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {ageData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 1 ? 'var(--accent)' : '#B08A4A'}
                      opacity={i === 1 ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--muted-foreground)' }}>
            Mayor segmento: <span style={{ color: 'var(--foreground)' }}>18-24 años (38%)</span>
          </p>
        </div>

        {/* Género */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: 'var(--muted-foreground)' }}
          >
            GÉNERO
          </p>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {genderData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-3">
            {genderData.map((g, i) => (
              <div key={g.name} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span style={{ color: 'var(--muted-foreground)' }}>{g.name}</span>
                <span className="font-bold" style={{ color: 'var(--foreground)' }}>{g.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Países */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: 'var(--muted-foreground)' }}
          >
            TOP PAÍSES
          </p>
          <div className="space-y-3">
            {countriesData.map((c, i) => (
              <div key={c.country}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--foreground)' }}>
                    {i + 1}. {c.country}
                  </span>
                  <span className="font-semibold" style={{ color: '#B08A4A' }}>
                    {c.pct}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${c.pct}%`,
                      backgroundColor: i === 0 ? 'var(--accent)' : '#B08A4A',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
