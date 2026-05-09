'use client'

import { X } from 'lucide-react'
import { ContentCategory, UnifiedStatus } from '@/lib/types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/components/pipeline/CategoryChip'
import { STATUSES, STATUS_META } from './lib/calendarioConstants'

interface CalendarioFiltersProps {
  totalCount: number
  typeCategories: ContentCategory[]
  categoryCounts: Record<string, number>
  filterCategory: ContentCategory | null
  onCategoryChange: (c: ContentCategory | null) => void
  statusFilter: UnifiedStatus[]
  onToggleStatus: (s: UnifiedStatus) => void
  onClearStatus: () => void
}

export function CalendarioFilters({
  totalCount,
  typeCategories,
  categoryCounts,
  filterCategory,
  onCategoryChange,
  statusFilter,
  onToggleStatus,
  onClearStatus,
}: CalendarioFiltersProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => onCategoryChange(null)}
          className="text-[11px] px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer"
          style={{
            backgroundColor: !filterCategory ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'var(--muted)',
            color: !filterCategory ? 'var(--accent)' : 'var(--muted-foreground)',
            border: !filterCategory ? '1px solid color-mix(in srgb, var(--accent) 33%, transparent)' : '1px solid var(--border)',
            transition: 'transform 160ms cubic-bezier(0.16,1,0.3,1), box-shadow 160ms cubic-bezier(0.16,1,0.3,1), background-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.transform = 'translateY(-1px)'
            el.style.boxShadow = '0 2px 8px color-mix(in srgb, var(--accent) 27%, transparent)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.transform = 'translateY(0)'
            el.style.boxShadow = 'none'
          }}
        >
          Todos · {totalCount}
        </button>
        {typeCategories.map((c) => {
          const col = CATEGORY_COLORS[c]
          const active = filterCategory === c
          const count = categoryCounts[c] ?? 0
          return (
            <button
              key={c}
              onClick={() => onCategoryChange(active ? null : c)}
              className="text-[11px] px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor: active ? col + '33' : 'var(--muted)',
                color: active ? col : 'var(--muted-foreground)',
                border: active ? `1px solid ${col}55` : '1px solid var(--border)',
                transition: 'transform 160ms cubic-bezier(0.16,1,0.3,1), box-shadow 160ms cubic-bezier(0.16,1,0.3,1), background-color 150ms ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-1px)'
                el.style.boxShadow = `0 2px 8px ${col}44`
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = 'none'
              }}
            >
              <span>{CATEGORY_LABELS[c]}</span>
              <span
                className="tabular-nums"
                style={{
                  opacity: active ? 0.85 : 0.65,
                  fontWeight: 700,
                }}
              >
                · {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Status filter — right side, same row as category chips */}
      <div
        className="flex items-center gap-1 rounded-lg p-0.5 flex-shrink-0"
        style={{
          border: '1px solid var(--border)',
          backgroundColor: 'var(--muted)',
        }}
        role="group"
        aria-label="Filtrar por estado"
      >
        {STATUSES.map((s) => {
          const meta = STATUS_META[s]
          const active = statusFilter.includes(s)
          const SIcon = meta.Icon
          return (
            <button
              key={s}
              type="button"
              onClick={() => onToggleStatus(s)}
              aria-pressed={active}
              className="text-[11px] px-2 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              style={{
                backgroundColor: active ? meta.color + '26' : 'transparent',
                color: active ? meta.color : 'var(--muted-foreground)',
                border: active ? `1px solid ${meta.color}55` : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card)'
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              <SIcon size={11} strokeWidth={2.5} />
              {meta.label}
            </button>
          )
        })}
        {statusFilter.length > 0 && (
          <button
            type="button"
            onClick={onClearStatus}
            aria-label="Limpiar filtro de estado"
            className="text-[11px] px-1.5 py-1 rounded-md cursor-pointer transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}
