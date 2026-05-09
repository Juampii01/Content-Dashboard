'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const AGE_DATA = [
  { age: '13-17', pct: 3 },
  { age: '18-24', pct: 28 },
  { age: '25-34', pct: 42 },
  { age: '35-44', pct: 18 },
  { age: '45-54', pct: 6 },
  { age: '55+', pct: 3 },
]

const GENDER_DATA = [
  { name: 'Hombres', value: 68 },
  { name: 'Mujeres', value: 30 },
  { name: 'Otro', value: 2 },
]

const CITIES_DATA = [
  { city: 'Buenos Aires', pct: 24 },
  { city: 'Ciudad de México', pct: 18 },
  { city: 'Bogotá', pct: 12 },
  { city: 'Madrid', pct: 9 },
  { city: 'Lima', pct: 8 },
  { city: 'Santiago', pct: 6 },
  { city: 'Otras', pct: 23 },
]

const COLORS = ['var(--accent)', 'var(--stat-icon)', '#9A8F89']

export function DemografiaTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">

        {/* Edad */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>DISTRIBUCIÓN POR EDAD</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={AGE_DATA} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="age" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [`${v}%`, 'Porcentaje']} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {AGE_DATA.map((_, i) => <Cell key={i} fill={i === 2 ? 'var(--accent)' : 'var(--accent)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--muted-foreground)' }}>
            Mayor segmento: <span style={{ color: 'var(--foreground)' }}>25-34 años (42%)</span>
          </p>
        </div>

        {/* Género */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>GÉNERO</p>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={GENDER_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {GENDER_DATA.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {GENDER_DATA.map((g, i) => (
              <div key={g.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span style={{ color: 'var(--muted-foreground)' }}>{g.name}</span>
                <span className="font-bold" style={{ color: 'var(--foreground)' }}>{g.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ciudades */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>TOP CIUDADES</p>
          <div className="space-y-3">
            {CITIES_DATA.map((c, i) => (
              <div key={c.city}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--foreground)' }}>{i + 1}. {c.city}</span>
                  <span className="font-semibold" style={{ color: 'var(--stat-icon)' }}>{c.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--accent)' }}>
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: i === 0 ? 'var(--accent)' : 'var(--stat-icon)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
