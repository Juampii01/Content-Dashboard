'use client'

import { useState } from 'react'
import { ChevronDown, ArrowUpDown } from 'lucide-react'

export type SortKey = 'fecha' | 'views' | 'viewsOrg' | 'likes' | 'saves' | 'comments' | 'shares' | 'multiplier'
export type SortDir = 'desc' | 'asc'
export type ReelType = 'all' | 'reel' | 'trial'
export type TrafficType = 'all' | 'organic' | 'paid'

interface Props {
  sort: SortKey
  dir: SortDir
  type: ReelType
  traffic: TrafficType
  onSort: (k: SortKey) => void
  onDir: () => void
  onType: (t: ReelType) => void
  onTraffic: (t: TrafficType) => void
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'fecha', label: 'Fecha' },
  { value: 'views', label: 'Views totales' },
  { value: 'viewsOrg', label: 'Views orgánico' },
  { value: 'likes', label: 'Likes' },
  { value: 'saves', label: 'Guardados' },
  { value: 'comments', label: 'Comentarios' },
  { value: 'shares', label: 'Compartidos' },
  { value: 'multiplier', label: 'Multiplicador' },
]

export function ReelFilters({ sort, dir, type, traffic, onSort, onDir, onType, onTraffic }: Props) {
  const [open, setOpen] = useState(false)

  const btnStyle = (active: boolean) => ({
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    backgroundColor: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Sort dropdown */}
      <div className="relative">
        <div className="flex items-center">
          <span className="text-sm mr-2" style={{ color: 'var(--muted-foreground)' }}>Ordenar por</span>
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
            {SORT_OPTIONS.find(o => o.value === sort)?.label}
            <ChevronDown size={13} />
          </button>
        </div>
        {open && (
          <div className="absolute top-full mt-1 z-20 rounded-xl overflow-hidden min-w-[180px]"
            style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { onSort(opt.value); setOpen(false) }}
                className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:opacity-80"
                style={{ color: sort === opt.value ? 'var(--accent)' : 'var(--foreground)' }}>
                {opt.label}
                {sort === opt.value && <span>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Direction */}
      <button onClick={onDir}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
        <ArrowUpDown size={13} />
        {dir === 'desc' ? 'Mayor → Menor' : 'Menor → Mayor'}
      </button>

      {/* Reel type */}
      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {(['all', 'reel', 'trial'] as ReelType[]).map(t => (
          <button key={t} onClick={() => onType(t)} style={btnStyle(type === t)}
            className="capitalize">{t === 'all' ? 'Todos' : t === 'reel' ? 'Reel' : 'Trial reel'}</button>
        ))}
      </div>

      {/* Traffic type */}
      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {(['all', 'organic', 'paid'] as TrafficType[]).map(t => (
          <button key={t} onClick={() => onTraffic(t)} style={btnStyle(traffic === t)}>
            {t === 'all' ? 'Todos' : t === 'organic' ? 'Orgánico' : 'Pagado'}
          </button>
        ))}
      </div>
    </div>
  )
}
