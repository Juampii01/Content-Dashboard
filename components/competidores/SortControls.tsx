'use client'

import { ArrowDownUp } from 'lucide-react'
import type { ReelSortField, ReelSortDir } from '@/lib/types/competidores'

interface SortControlsProps {
  field: ReelSortField
  dir: ReelSortDir
  onChange: (field: ReelSortField, dir: ReelSortDir) => void
}

const SORT_FIELDS: { value: ReelSortField; label: string }[] = [
  { value: 'views',    label: 'Vistas' },
  { value: 'likes',   label: 'Likes' },
  { value: 'comments', label: 'Comentarios' },
  { value: 'postedAt', label: 'Fecha' },
]

export function SortControls({ field, dir, onChange }: SortControlsProps) {
  function handleFieldClick(f: ReelSortField) {
    if (f === field) {
      onChange(field, dir === 'desc' ? 'asc' : 'desc')
    } else {
      onChange(f, 'desc')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Segmented control for sort field */}
      <div
        className="flex rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {SORT_FIELDS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleFieldClick(opt.value)}
            className="text-xs px-3 py-1.5 font-medium transition-all"
            style={{
              backgroundColor: field === opt.value ? 'var(--accent)' : 'var(--card)',
              color: field === opt.value ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Direction toggle */}
      <button
        type="button"
        onClick={() => onChange(field, dir === 'desc' ? 'asc' : 'desc')}
        aria-label={dir === 'desc' ? 'Orden descendente (cambiar a ascendente)' : 'Orden ascendente (cambiar a descendente)'}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
        style={{ backgroundColor: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
      >
        <ArrowDownUp
          size={13}
          style={{
            transform: dir === 'asc' ? 'scaleY(-1)' : 'scaleY(1)',
            transition: 'transform 0.15s',
          }}
        />
        {dir === 'desc' ? 'Mayor' : 'Menor'}
      </button>
    </div>
  )
}
