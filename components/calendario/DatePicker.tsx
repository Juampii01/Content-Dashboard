'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_NAMES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]
const DAY_NAMES = ['L','M','X','J','V','S','D']

// Brand tokens — CSS variables from globals.css
const BRAND_PRIMARY   = 'var(--accent)'
const BRAND_IVORY     = 'var(--accent-foreground)'
const BRAND_GOLD      = 'var(--color-eternity-gold)'

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseLocal(str: string): Date | null {
  if (!str) return null
  const d = new Date(str + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

function formatDisplay(str: string): string {
  const d = parseLocal(str)
  if (!d) return ''
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}

function getFirstDayOfWeek(y: number, m: number) {
  const day = new Date(y, m, 1).getDay() // 0=Sun
  return day === 0 ? 6 : day - 1          // Mon=0 … Sun=6
}

interface DatePickerProps {
  value: string                  // 'yyyy-mm-dd' or ''
  onChange: (v: string) => void
  min?: string
  placeholder?: string
  triggerClassName?: string
  triggerStyle?: React.CSSProperties
}

export function DatePicker({
  value,
  onChange,
  min,
  placeholder = 'Vacío',
  triggerClassName = '',
  triggerStyle,
}: DatePickerProps) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const initFromValue = () => {
    const d = parseLocal(value) ?? today
    return { y: d.getFullYear(), m: d.getMonth() }
  }

  const [open,      setOpen]      = useState(false)
  const [viewYear,  setViewYear]  = useState(initFromValue().y)
  const [viewMonth, setViewMonth] = useState(initFromValue().m)
  const containerRef = useRef<HTMLDivElement>(null)
  const [flipUp, setFlipUp]       = useState(false)

  // Sync view when value changes externally
  useEffect(() => {
    const d = parseLocal(value)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync view state from external controlled value
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()) }
  }, [value])

  // Detect if popover should open upward
  useEffect(() => {
    if (!open || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
     
    setFlipUp(rect.bottom + 340 > window.innerHeight - 16)
  }, [open])

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- setters are stable across renders
  const prevMonth = useCallback(() => {
    setViewMonth(m => { if (m === 0) { setViewYear(y => y - 1); return 11 } return m - 1 })
  }, [])
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- setters are stable across renders
  const nextMonth = useCallback(() => {
    setViewMonth(m => { if (m === 11) { setViewYear(y => y + 1); return 0 } return m + 1 })
  }, [])

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- captures viewYear/viewMonth/min/onChange intentionally
  const selectDay = useCallback((day: number) => {
    const s = toDateStr(viewYear, viewMonth, day)
    if (min && s < min) return
    onChange(s)
    setOpen(false)
  }, [viewYear, viewMonth, min, onChange])

  // Build day grid (Mon-first)
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay    = getFirstDayOfWeek(viewYear, viewMonth)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div ref={containerRef} className="relative inline-block">

      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`text-sm whitespace-nowrap cursor-pointer transition-opacity hover:opacity-60 ${triggerClassName}`}
        style={triggerStyle}
      >
        {value
          ? formatDisplay(value)
          : <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>{placeholder}</span>}
      </button>

      {/* ── Calendar popover ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="absolute z-[80] rounded-xl shadow-xl select-none animate-in fade-in zoom-in-95 duration-150"
          style={{
            width: 224,
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            ...(flipUp
              ? { bottom: 'calc(100% + 6px)', top: 'auto' }
              : { top: 'calc(100% + 6px)' }),
            left: 0,
          }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="flex items-center justify-center rounded-full transition-colors cursor-pointer"
              style={{ width: 22, height: 22, color: 'var(--muted-foreground)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <ChevronLeft size={12} />
            </button>

            <span className="text-xs font-semibold capitalize" style={{ color: 'var(--foreground)' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="flex items-center justify-center rounded-full transition-colors cursor-pointer"
              style={{ width: 22, height: 22, color: 'var(--muted-foreground)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <ChevronRight size={12} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 px-2">
            {DAY_NAMES.map(d => (
              <div
                key={d}
                className="flex items-center justify-center h-5 text-[10px] font-semibold"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-2 pb-2.5 gap-y-0">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="h-7" />

              const dateStr    = toDateStr(viewYear, viewMonth, day)
              const isSelected = dateStr === value
              const isToday    = dateStr === todayStr
              const isDisabled = !!(min && dateStr < min)

              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDay(day)}
                  className="flex items-center justify-center rounded-full transition-all duration-150"
                  style={{
                    height: 28,
                    width: 28,
                    margin: '0 auto',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                    backgroundColor: isSelected ? BRAND_PRIMARY : 'transparent',
                    color: isSelected
                      ? BRAND_IVORY
                      : isDisabled
                        ? 'var(--border)'
                        : 'var(--foreground)',
                    outline: isToday && !isSelected
                      ? `1.5px solid ${BRAND_GOLD}`
                      : 'none',
                    outlineOffset: '-1.5px',
                    opacity: isDisabled ? 0.35 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${BRAND_PRIMARY} 12%, transparent)`
                      e.currentTarget.style.color = BRAND_PRIMARY
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--foreground)'
                    }
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>

        </div>
      )}
    </div>
  )
}
