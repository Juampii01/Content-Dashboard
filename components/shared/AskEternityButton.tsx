'use client'

import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'

export function AskEternityButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 z-50"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', boxShadow: '0 0 20px rgba(142,31,47,0.4)' }}>
        <Sparkles size={16} />
        <span className="text-sm font-semibold">Ask Eternity</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,11,12,0.8)' }}>
          <div className="rounded-2xl p-8 max-w-md w-full mx-4 text-center"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 hover:opacity-70"
              style={{ color: 'var(--muted-foreground)', position: 'relative', float: 'right' }}>
              <X size={18} />
            </button>
            <Sparkles size={32} className="mx-auto mb-4" style={{ color: 'var(--accent)' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>Ask Eternity AI</h3>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Próximamente: análisis profundo con IA de tus métricas, sugerencias de mejora y predicciones de rendimiento.
            </p>
            <button onClick={() => setOpen(false)}
              className="mt-6 px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-80"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}
