'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChipEditor } from '../ChipEditor'
import { useAISuggest, AISuggestButton, GhostChips } from '../AISuggest'
import { ICPData } from '@/lib/types'
import { tryParseArray } from '@/lib/utils/parseArray'

const EMPTY: ICPData = {
  nombre: '', edad: '', ingresos: '', nicho: '', rol: '',
  dolores: [], deseos: [], creencias: [],
  updatedAt: '',
}

function formatDate(iso: string) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ICPSection() {
  const [data, setData]       = useState<ICPData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from API on mount
  useEffect(() => {
    fetch('/api/bases/icp')
      .then((r) => r.json())
      .then((row) => {
        if (!row) return
        setData({
          nombre:    row.nombre    ?? '',
          edad:      row.edad      ?? '',
          ingresos:  row.ingresos  ?? '',
          nicho:     row.nicho     ?? '',
          rol:       row.rol       ?? '',
          dolores:   tryParseArray(row.dolores),
          deseos:    tryParseArray(row.deseos),
          creencias: tryParseArray(row.creencias),
          updatedAt: row.updatedAt ?? '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const persist = useCallback((next: ICPData) => {
    const updated = { ...next, updatedAt: new Date().toISOString() }
    setData(updated)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch('/api/bases/icp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:    updated.nombre,
          edad:      updated.edad,
          ingresos:  updated.ingresos,
          nicho:     updated.nicho,
          rol:       updated.rol,
          dolores:   updated.dolores,
          deseos:    updated.deseos,
          creencias: updated.creencias,
        }),
      }).catch(() => {})
    }, 400)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const creenciasAI = useAISuggest('icp_creencias')

  const pickCreencia = useCallback((value: string) => {
    const val = value.trim()
    if (val && !data.creencias.includes(val)) {
      persist({ ...data, creencias: [...data.creencias, val] })
    }
    creenciasAI.dropSuggestion(value)
  }, [data, persist, creenciasAI])

  const field = (key: keyof Pick<ICPData, 'nombre' | 'edad' | 'ingresos' | 'nicho' | 'rol'>) => (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
        style={{ color: 'var(--muted-foreground)' }}>
        {key.charAt(0).toUpperCase() + key.slice(1)}
      </label>
      <input
        value={data[key]}
        onChange={(e) => persist({ ...data, [key]: e.target.value })}
        placeholder={`Tu ${key}...`}
        className="w-full text-sm px-3 py-1.5 rounded-lg outline-none"
        style={{
          backgroundColor: 'var(--muted)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        }}
      />
    </div>
  )

  const chipGroup = (
    label: string,
    key: 'dolores' | 'deseos' | 'creencias',
    color: string,
    placeholder: string,
    withAI = false
  ) => (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </p>
        <div className="flex items-center gap-2">
          {data[key].length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: color + '22', color }}>
              {data[key].length}
            </span>
          )}
          {withAI && (
            <AISuggestButton onClick={creenciasAI.suggest} loading={creenciasAI.loading} label="Sugerir" color={color} />
          )}
        </div>
      </div>
      <ChipEditor
        items={data[key]}
        onChange={(items) => persist({ ...data, [key]: items })}
        placeholder={placeholder}
        chipColor={color}
      />
      {withAI && (
        <GhostChips
          suggestions={creenciasAI.suggestions}
          error={creenciasAI.error}
          color={color}
          onPick={pickCreencia}
          onDismissAll={creenciasAI.clear}
        />
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-32 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
              <div className="h-2.5 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            </div>
          </div>
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-2 w-12 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
              <div className="h-8 w-full rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1,2,3].map((i) => (
            <div key={i} className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="h-2.5 w-16 rounded animate-pulse mb-3" style={{ backgroundColor: 'var(--muted)' }} />
              <div className="flex flex-wrap gap-2">
                {[70, 90, 55].map((w, j) => (
                  <div key={j} className="h-6 rounded-full animate-pulse" style={{ width: `${w}px`, backgroundColor: 'var(--muted)' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {data.updatedAt && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 13%, transparent)', color: 'var(--warning)', border: '1px solid color-mix(in srgb, var(--warning) 27%, transparent)' }}>
            Actualizado: {formatDate(data.updatedAt)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, var(--card))', color: 'var(--accent)', border: '2px solid color-mix(in srgb, var(--accent) 28%, transparent)' }}
            >
              {data.nombre ? data.nombre.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {data.nombre || 'Nombre del avatar'}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {data.rol || 'Rol / ocupación'}
              </p>
            </div>
          </div>

          {field('nombre')}
          {field('edad')}
          {field('ingresos')}
          {field('nicho')}
          {field('rol')}
        </div>

        <div className="space-y-4">
          {chipGroup('Dolores', 'dolores', 'var(--accent)', 'Ej: No sabe de dónde vienen clientes')}
          {chipGroup('Deseos', 'deseos', 'var(--warning)', 'Ej: Clientes predecibles')}
          {chipGroup('Creencias / Objeciones', 'creencias', '#7A6060', 'Ej: Los ads no funcionan en mi nicho', true)}
        </div>
      </div>
    </div>
  )
}

