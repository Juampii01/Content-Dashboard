'use client'

import { Lock } from 'lucide-react'

export function HistoriasTab() {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <Lock size={20} style={{ color: 'var(--muted-foreground)' }} />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
          Datos de Historias no disponibles
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          Instagram no expone métricas de Stories a través de la API básica.
          Para acceder a estos datos se requiere la aprobación de Meta App Review
          con permisos avanzados de Insights.
        </p>
      </div>
    </div>
  )
}
