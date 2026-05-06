'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, X, Lightbulb } from 'lucide-react'
import { InsightItem } from '@/lib/types'

const STORAGE_KEY = 'insights'

export function InsightsSection() {
  const [items, setItems]     = useState<InsightItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [draft, setDraft]     = useState({ title: '', body: '' })
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from API on mount
  useEffect(() => {
    fetch(`/api/bases/${STORAGE_KEY}`)
      .then((r) => r.json())
      .then((row) => {
        if (!row) return
        try {
          const parsed = JSON.parse(row.items ?? '[]')
          if (Array.isArray(parsed)) setItems(parsed as InsightItem[])
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const persist = useCallback((next: InsightItem[]) => {
    setItems(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/bases/${STORAGE_KEY}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // items holds the full InsightItem objects serialised as JSON strings in the array
        body: JSON.stringify({ items: next.map((i) => JSON.stringify(i)) }),
      }).catch(() => {})
    }, 400)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const addInsight = () => {
    const title = draft.title.trim()
    if (!title) return
    const item: InsightItem = {
      id: crypto.randomUUID(),
      title,
      body: draft.body.trim(),
      createdAt: new Date().toISOString(),
    }
    persist([...items, item])
    setDraft({ title: '', body: '' })
    setAdding(false)
  }

  const remove = (id: string) => persist(items.filter((i) => i.id !== id))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Cargando…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative rounded-xl p-4 w-full sm:w-64 flex-shrink-0"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <button
              onClick={() => remove(item.id)}
              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <X size={10} style={{ color: 'var(--accent-foreground)' }} />
            </button>
            <Lightbulb size={14} style={{ color: '#B08A4A' }} className="mb-2" />
            <p className="text-sm font-semibold mb-1 pr-5" style={{ color: 'var(--foreground)' }}>
              {item.title}
            </p>
            {item.body && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                {item.body}
              </p>
            )}
          </div>
        ))}

        {adding ? (
          <div
            className="rounded-xl p-4 w-full sm:w-64 flex-shrink-0 space-y-2"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--accent)' }}
          >
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Título del insight"
              className="w-full text-sm px-2 py-1 rounded outline-none"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              onKeyDown={(e) => { if (e.key === 'Enter') addInsight(); if (e.key === 'Escape') setAdding(false) }}
            />
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              placeholder="Descripción (opcional)"
              rows={2}
              className="w-full text-xs px-2 py-1 rounded outline-none resize-none"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            />
            <div className="flex gap-2">
              <button
                onClick={addInsight}
                className="flex-1 text-xs py-1 rounded-lg font-medium"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                Guardar
              </button>
              <button
                onClick={() => { setAdding(false); setDraft({ title: '', body: '' }) }}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-xl p-4 w-full sm:w-64 flex-shrink-0 flex flex-col items-center justify-center gap-2 transition-all hover:opacity-80"
            style={{ border: '1px dashed var(--border)', backgroundColor: 'transparent' }}
          >
            <Plus size={18} style={{ color: 'var(--muted-foreground)' }} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Nueva nota</span>
          </button>
        )}
      </div>

      {items.length === 0 && !adding && (
        <p className="text-xs italic" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
          Guarda aquí aprendizajes, patrones de tu audiencia o ideas estratégicas que no quieres perder.
        </p>
      )}
    </div>
  )
}
