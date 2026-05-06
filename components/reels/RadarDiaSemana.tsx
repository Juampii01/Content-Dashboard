'use client'

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

const DATA = [
  { day: 'Dom', views: 12000 },
  { day: 'Lun', views: 18000 },
  { day: 'Mar', views: 22000 },
  { day: 'Mié', views: 75610 },
  { day: 'Jue', views: 31000 },
  { day: 'Vie', views: 28000 },
  { day: 'Sáb', views: 45000 },
]

export function RadarDiaSemana() {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--muted-foreground)' }}>VIEWS POR DÍA DE SEMANA</p>
      <p className="text-[10px] mb-3" style={{ color: 'var(--muted-foreground)' }}>Distribución de views de esta tab</p>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={DATA}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="day" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
            <Radar dataKey="views" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} strokeWidth={1.5} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--muted)' }}>
        <p style={{ color: 'var(--muted-foreground)' }}>DÍA CON MÁS VIEWS</p>
        <p className="font-semibold" style={{ color: 'var(--foreground)' }}>Mié – 75,610 views</p>
      </div>
    </div>
  )
}
