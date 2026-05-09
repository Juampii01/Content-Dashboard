'use client'

const REFS = [
  { id: 1, title: 'Hook magnético de apertura', category: 'Hook', tags: ['viralidad', 'atención'], views: '2.1M', platform: 'IG' },
  { id: 2, title: 'Transición de problema a solución', category: 'Estructura', tags: ['ventas', 'conversión'], views: '890K', platform: 'TT' },
  { id: 3, title: 'CTA con urgencia sin presión', category: 'CTA', tags: ['conversión', 'dm'], views: '1.4M', platform: 'IG' },
  { id: 4, title: 'Storytelling de origen', category: 'Storytelling', tags: ['confianza', 'marca'], views: '650K', platform: 'YT' },
  { id: 5, title: 'Prueba social empilada', category: 'Social Proof', tags: ['resultados', 'testimonios'], views: '3.2M', platform: 'IG' },
  { id: 6, title: 'Contraste antes/después', category: 'Estructura', tags: ['transformación'], views: '980K', platform: 'TT' },
]

const CAT_COLORS: Record<string, string> = {
  Hook: 'var(--accent)', Estructura: '#B08A4A', CTA: '#A63A4B', Storytelling: '#6E2A35', 'Social Proof': '#8A7A4A',
}

export function ReferenciasTab() {
  return (
    <div>
      <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>Biblioteca de referencias de contenido que inspiran tu estrategia.</p>
      <div className="grid grid-cols-3 gap-4">
        {REFS.map(ref => (
          <div key={ref.id} className="rounded-xl overflow-hidden hover:scale-[1.01] transition-all"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <div className="h-32 flex items-center justify-center"
              style={{ backgroundColor: 'var(--muted)' }}>
              <span className="text-5xl">🎥</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] px-2 py-0.5 rounded font-medium"
                  style={{ backgroundColor: `${CAT_COLORS[ref.category]}20`, color: CAT_COLORS[ref.category], border: `1px solid ${CAT_COLORS[ref.category]}40` }}>
                  {ref.category}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--stat-icon)' }}>{ref.views}</span>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>{ref.title}</p>
              <div className="flex flex-wrap gap-1">
                {ref.tags.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--muted-foreground)' }}>#{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
