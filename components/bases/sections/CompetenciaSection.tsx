'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { ChipEditor } from '../ChipEditor'
import { CompetitorEntry } from '@/lib/types'

const STORAGE_KEY = 'competencia'

export function CompetenciaSection() {
  const [items, setItems]     = useState<CompetitorEntry[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from API on mount
  useEffect(() => {
    fetch(`/api/bases/${STORAGE_KEY}`)
      .then((r) => r.json())
      .then((row) => {
        if (!row) return
        try {
          const parsed = JSON.parse(row.items ?? '[]')
          if (Array.isArray(parsed)) setItems(parsed as CompetitorEntry[])
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const persist = useCallback((next: CompetitorEntry[]) => {
    setItems(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/bases/${STORAGE_KEY}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: next.map((i) => JSON.stringify(i)) }),
      }).catch(() => {})
    }, 400)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const addCompetitor = () => {
    const entry: CompetitorEntry = {
      id: crypto.randomUUID(),
      nombre: '',
      fortalezas: [],
      debilidades: [],
      diferenciador: '',
    }
    persist([...items, entry])
  }

  const update = (id: string, patch: Partial<CompetitorEntry>) => {
    persist(items.map((c) => c.id === id ? { ...c, ...patch } : c))
  }

  const remove = (id: string) => persist(items.filter((c) => c.id !== id))

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2].map((i) => (
          <div key={i} className="rounded-xl p-5 space-y-4"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="h-8 w-48 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1,2].map((j) => (
                <div key={j} className="space-y-2">
                  <div className="h-2 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
                  <div className="flex flex-wrap gap-2">
                    {[70, 85, 60].map((w, k) => (
                      <div key={k} className="h-6 rounded-full animate-pulse" style={{ width: `${w}px`, backgroundColor: 'var(--muted)' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((comp) => (
        <div
          key={comp.id}
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <input
              value={comp.nombre}
              onChange={(e) => update(comp.id, { nombre: e.target.value })}
              placeholder="@nombre_competidor"
              className="text-sm font-semibold px-3 py-1.5 rounded-lg outline-none flex-1"
              style={{
                backgroundColor: 'var(--muted)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            />
            <button
              onClick={() => remove(comp.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <X size={12} style={{ color: 'var(--accent-foreground)' }} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--muted-foreground)' }}>
                Fortalezas
              </p>
              <ChipEditor
                items={comp.fortalezas}
                onChange={(f) => update(comp.id, { fortalezas: f })}
                placeholder="Ej: Gran comunidad"
                chipColor="#B08A4A"
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--muted-foreground)' }}>
                Debilidades
              </p>
              <ChipEditor
                items={comp.debilidades}
                onChange={(d) => update(comp.id, { debilidades: d })}
                placeholder="Ej: Contenido poco profundo"
                chipColor="var(--accent)"
              />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--muted-foreground)' }}>
              Cómo nos diferenciamos
            </p>
            <input
              value={comp.diferenciador}
              onChange={(e) => update(comp.id, { diferenciador: e.target.value })}
              placeholder="Ej: Nosotros enfocamos en estrategia, no en cantidad..."
              className="w-full text-sm px-3 py-1.5 rounded-lg outline-none"
              style={{
                backgroundColor: 'var(--muted)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            />
          </div>
        </div>
      ))}

      <button
        onClick={addCompetitor}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all hover:opacity-80"
        style={{ border: '1px dashed var(--border)', color: 'var(--muted-foreground)' }}
      >
        <Plus size={14} />
        Añadir competidor
      </button>

      {items.length === 0 && (
        <p className="text-xs italic text-center pt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
          Añade los creadores o marcas con los que compites o de los que aprendes.
        </p>
      )}
    </div>
  )
}
