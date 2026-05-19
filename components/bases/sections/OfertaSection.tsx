'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChipEditor } from '../ChipEditor'
import { OfertaData } from '@/lib/types'
import { tryParseArray } from '@/lib/utils/parseArray'

const STORAGE_KEY = 'oferta'

const EMPTY: OfertaData = {
  nombre: '', precio: '', promesa: '', paraQuien: '', incluye: [], updatedAt: '',
}

export function OfertaSection() {
  const [data, setData]       = useState<OfertaData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from API on mount
  useEffect(() => {
    fetch(`/api/bases/${STORAGE_KEY}`)
      .then((r) => r.json())
      .then((row) => {
        if (!row) return
        // content holds JSON of { nombre, precio, promesa, paraQuien }
        try {
          const fields = JSON.parse(row.content || '{}')
          const incluye = tryParseArray(row.items)
          setData({
            nombre:    fields.nombre    ?? '',
            precio:    fields.precio    ?? '',
            promesa:   fields.promesa   ?? '',
            paraQuien: fields.paraQuien ?? '',
            incluye,
            updatedAt: row.updatedAt ?? '',
          })
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const persist = useCallback((next: OfertaData) => {
    setData(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/bases/${STORAGE_KEY}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: JSON.stringify({
            nombre:    next.nombre,
            precio:    next.precio,
            promesa:   next.promesa,
            paraQuien: next.paraQuien,
          }),
          items: next.incluye,
        }),
      }).catch(() => {})
    }, 400)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const save = useCallback((patch: Partial<OfertaData>) => {
    persist({ ...data, ...patch, updatedAt: new Date().toISOString() })
  }, [data, persist])

  const field = (
    key: keyof Pick<OfertaData, 'nombre' | 'precio' | 'promesa' | 'paraQuien'>,
    label: string,
    placeholder: string,
    multiline = false
  ) => (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
        style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={data[key]}
          onChange={(e) => save({ [key]: e.target.value })}
          placeholder={placeholder}
          rows={2}
          className="w-full text-sm px-3 py-1.5 rounded-lg outline-none resize-none"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        />
      ) : (
        <input
          value={data[key]}
          onChange={(e) => save({ [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full text-sm px-3 py-1.5 rounded-lg outline-none"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        />
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        {[1,2,3,4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className={`h-${i >= 3 ? 16 : 8} w-full rounded-lg animate-pulse`} style={{ backgroundColor: 'var(--muted)', height: i >= 3 ? '64px' : '34px' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {field('nombre', 'Nombre de la oferta', 'Ej: Mentoría 1:1 para creadores')}
      {field('precio', 'Precio', 'Ej: $497/mes · $997 pago único')}
      {field('promesa', 'Promesa principal', 'Ej: De 0 a 10k seguidores en 90 días con contenido estratégico', true)}
      {field('paraQuien', '¿Para quién es?', 'Ej: Coaches y consultores que quieren monetizar su contenido', true)}

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block"
          style={{ color: 'var(--muted-foreground)' }}>
          ¿Qué incluye?
        </label>
        <ChipEditor
          items={data.incluye}
          onChange={(items) => save({ incluye: items })}
          placeholder="Ej: 4 llamadas al mes"
          chipColor="#B08A4A"
        />
      </div>
    </div>
  )
}

