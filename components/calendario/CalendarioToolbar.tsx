'use client'

import { RefObject } from 'react'
import { ChevronLeft, ChevronRight, Search, X, Keyboard } from 'lucide-react'
import { MONTH_NAMES, ViewMode, formatWeekRange } from './lib/calendarioConstants'

interface CalendarioToolbarProps {
  viewMode: ViewMode
  year: number
  month: number
  weekStart: Date
  searchOpen: boolean
  searchInput: string
  searchQuery: string
  matchCount: number
  searchInputRef: RefObject<HTMLInputElement | null>
  onSearchToggle: () => void
  onSearchInput: (value: string) => void
  onSearchClear: () => void
  onViewChange: (v: ViewMode) => void
  onGoToday: () => void
  onPrev: () => void
  onNext: () => void
  onOpenShortcuts: () => void
  onAdd: () => void
}

export function CalendarioToolbar({
  viewMode,
  year,
  month,
  weekStart,
  searchOpen,
  searchInput,
  searchQuery,
  matchCount,
  searchInputRef,
  onSearchToggle,
  onSearchInput,
  onSearchClear,
  onViewChange,
  onGoToday,
  onPrev,
  onNext,
  onOpenShortcuts,
  onAdd,
}: CalendarioToolbarProps) {
  const viewIdx = viewMode === 'month' ? 0 : 1

  return (
    <div className="flex items-center gap-2.5">
      {/* Search */}
      <div
        className="flex items-center rounded-lg transition-all"
        style={{
          border: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          overflow: 'hidden',
          width: searchOpen ? 220 : 32,
          height: 32,
          transition: 'width 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <button
          type="button"
          aria-label={searchOpen ? 'Cerrar buscador' : 'Abrir buscador (/)'}
          onClick={onSearchToggle}
          className="flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
          style={{ width: 32, height: 32, color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--muted)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
        >
          <Search size={14} strokeWidth={2.25} />
        </button>
        {searchOpen && (
          <>
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => onSearchInput(e.target.value)}
              placeholder="Buscar..."
              aria-label="Buscar en título y descripción"
              className="flex-1 bg-transparent text-[12px] outline-none px-0"
              style={{ color: 'var(--foreground)', minWidth: 0 }}
            />
            {searchQuery.trim() && (
              <span
                className="text-[10px] font-bold tabular-nums px-1.5 rounded-full mr-1 flex-shrink-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 18%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
                  lineHeight: '16px',
                }}
                aria-label={`${matchCount} coincidencias`}
              >
                {matchCount}
              </span>
            )}
            {searchInput && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={onSearchClear}
                className="flex items-center justify-center cursor-pointer flex-shrink-0"
                style={{ width: 28, height: 32, color: 'var(--muted-foreground)' }}
              >
                <X size={12} strokeWidth={2.25} />
              </button>
            )}
          </>
        )}
      </div>

      {/* View switch: segmented control with sliding indicator */}
      <div
        className="relative flex rounded-lg p-0.5"
        style={{
          border: '1px solid var(--border)',
          backgroundColor: 'var(--muted)',
        }}
      >
        <div
          aria-hidden
          className="absolute top-0.5 bottom-0.5 rounded-md"
          style={{
            left: `calc(${viewIdx * 50}% + 2px)`,
            width: 'calc(50% - 4px)',
            backgroundColor: 'var(--accent)',
            boxShadow: 'var(--shadow-card-sm)',
            transition: 'left 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        {(['month', 'week'] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className="relative z-10 text-xs px-3.5 py-1.5 font-semibold transition-colors cursor-pointer"
            style={{
              color: viewMode === v ? '#fff' : 'var(--muted-foreground)',
              minWidth: 72,
            }}
          >
            {v === 'month' ? 'Mensual' : 'Semanal'}
          </button>
        ))}
      </div>

      {/* Nav: single segmented control (Hoy | ‹ | title | ›) */}
      <div
        className="flex items-center rounded-lg cal-nav-group"
        style={{
          border: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={onGoToday}
          className="cal-nav-btn text-xs px-3 font-semibold transition-colors cursor-pointer"
          style={{
            color: 'var(--muted-foreground)',
            borderRight: '1px solid var(--border)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--muted)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
        >
          Hoy
        </button>
        <button
          type="button"
          aria-label={viewMode === 'month' ? 'Mes anterior' : 'Semana anterior'}
          onClick={onPrev}
          className="cal-nav-btn flex items-center justify-center transition-colors cursor-pointer"
          style={{ borderRight: '1px solid var(--border)', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--muted)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
        >
          <ChevronLeft size={15} style={{ color: 'var(--muted-foreground)' }} strokeWidth={2.25} />
        </button>
        <span
          className="text-[13px] font-bold px-3 min-w-[150px] text-center tabular-nums"
          style={{ color: 'var(--foreground)', letterSpacing: '-0.01em' }}
        >
          {viewMode === 'month'
            ? `${MONTH_NAMES[month]} ${year}`
            : formatWeekRange(weekStart)
          }
        </span>
        <button
          type="button"
          aria-label={viewMode === 'month' ? 'Mes siguiente' : 'Semana siguiente'}
          onClick={onNext}
          className="cal-nav-btn flex items-center justify-center transition-colors cursor-pointer"
          style={{ borderLeft: '1px solid var(--border)', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--muted)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
        >
          <ChevronRight size={15} style={{ color: 'var(--muted-foreground)' }} strokeWidth={2.25} />
        </button>
      </div>

      {/* Keyboard shortcuts trigger */}
      <button
        type="button"
        aria-label="Ver atajos de teclado"
        title="Atajos de teclado (?)"
        onClick={onOpenShortcuts}
        className="flex items-center justify-center rounded-lg cursor-pointer transition-colors"
        style={{
          width: 32,
          height: 32,
          border: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          color: 'var(--muted-foreground)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--muted)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card)' }}
      >
        <Keyboard size={14} strokeWidth={2.25} />
      </button>

      <button
        type="button"
        onClick={onAdd}
        className="text-xs px-3.5 rounded-lg font-semibold transition-all cursor-pointer cal-add-btn"
        style={{
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-foreground)',
          boxShadow: 'var(--shadow-card-sm)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(-1px)'
          el.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--accent) 45%, transparent)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'var(--shadow-card-sm)'
        }}
      >
        + Añadir
      </button>
    </div>
  )
}
