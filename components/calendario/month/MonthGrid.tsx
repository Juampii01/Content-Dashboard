'use client'

import { useEffect, useState } from 'react'
import type { ContentItem, GridCell } from '@/lib/types'
import { DayCell } from './DayCell'
import { EventBar } from './EventBar'
import { DAY_NAMES, LANES_MAX, toDateStr, parseDate, daysBetween, assignLanes } from './calendarUtils'

interface DragPreview {
  id: string
  start: string
  end: string
}

interface MonthGridProps {
  year: number
  month: number
  weeks: GridCell[][]
  items: ContentItem[]
  today: string
  dragPreview: DragPreview | null
  draggedId: string | null
  overDate: string | null
  overIsCurrent?: boolean
  navDirection: 'forward' | 'back'
  onDayClick: (dateStr: string, anchor: { x: number; y: number }) => void
  onItemClick: (item: ContentItem) => void
  onResizeStart: (e: React.PointerEvent, item: ContentItem, side: 'start' | 'end') => void
  onDragStart: (e: React.PointerEvent, item: ContentItem, grabOffset: number) => void
  onItemNudge?: (item: ContentItem, delta: number) => void
  onOverflowClick?: (dateStr: string, dayItems: ContentItem[], anchor: { x: number; y: number }) => void
  onCycleStatus?: (id: string) => void
  onDuplicate?: (id: string) => void
  onDelete?: (id: string) => void
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = () => setReduced(mq.matches)
    handler()
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

export function MonthGrid({
  year, month, weeks, items, today, dragPreview, draggedId, overDate, overIsCurrent = true, navDirection,
  onDayClick, onItemClick, onResizeStart, onDragStart, onItemNudge,
  onOverflowClick, onCycleStatus, onDuplicate, onDelete,
}: MonthGridProps) {
  const reducedMotion = usePrefersReducedMotion()
  const animClass = reducedMotion
    ? ''
    : `animate-in fade-in duration-200 ${navDirection === 'forward' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'}`

  return (
    <div
      className="flex flex-col gap-0"
      style={reducedMotion ? undefined : {
        animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="grid grid-cols-7 mb-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold py-2.5 uppercase"
            style={{
              color: 'var(--muted-foreground)',
              letterSpacing: '0.08em',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        key={`${year}-${month}`}
        className={`flex flex-col gap-1.5 ${animClass}`}
        style={reducedMotion ? undefined : {
          animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {weeks.map((week, wi) => {
          const weekStartStr = toDateStr(week[0].date)
          const weekEndStr   = toDateStr(week[6].date)

          const segs = items.map((it) => {
            const preview = dragPreview && dragPreview.id === it.id ? dragPreview : null
            const effStart = preview ? preview.start : it.date
            const effEnd   = preview ? preview.end   : (it.endDate ?? it.date)
            if (parseDate(effEnd)   < parseDate(weekStartStr)) return null
            if (parseDate(effStart) > parseDate(weekEndStr))   return null
            const startIdx  = Math.max(0, daysBetween(weekStartStr, effStart))
            const endIdx    = Math.min(6, daysBetween(weekStartStr, effEnd))
            const spansLeft  = parseDate(effStart) < parseDate(weekStartStr)
            const spansRight = parseDate(effEnd)   > parseDate(weekEndStr)
            return { item: it, startIdx, endIdx, spansLeft, spansRight }
          }).filter((x): x is NonNullable<typeof x> => x !== null)

          const laned = assignLanes(segs)
          const overflowByDay: Record<number, number> = {}
          for (const seg of laned) {
            if (seg.lane >= LANES_MAX) {
              for (let i = seg.startIdx; i <= seg.endIdx; i++) {
                overflowByDay[i] = (overflowByDay[i] ?? 0) + 1
              }
            }
          }

          // Cells covered by an event bar (except the first cell of the span) get their border hidden
          // so the event bar appears to float above the grid without boxed cells showing behind it
          const midSpanCells = new Set<number>()
          for (const seg of laned) {
            if (seg.lane < LANES_MAX && seg.endIdx > seg.startIdx) {
              for (let i = seg.startIdx + 1; i <= seg.endIdx; i++) {
                midSpanCells.add(i)
              }
            }
          }

          return (
            <div key={wi} data-week-row className="relative grid grid-cols-7 gap-1">
              {week.map((cell, di) => {
                const dateStr = toDateStr(cell.date)
                const isToday = dateStr === today
                const maxOccupiedLane = laned
                  .filter((s) => s.lane < LANES_MAX && s.startIdx <= di && s.endIdx >= di)
                  .reduce((max, s) => Math.max(max, s.lane + 1), 0)
                const isOver = overDate === dateStr
                const dayItems = laned
                  .filter((s) => s.startIdx <= di && s.endIdx >= di)
                  .map((s) => s.item)
                return (
                  <DayCell
                    key={di}
                    dateStr={dateStr}
                    isToday={isToday}
                    isCurrent={cell.isCurrent}
                    date={cell.date}
                    lane={maxOccupiedLane}
                    overflow={overflowByDay[di] ?? 0}
                    isOver={isOver}
                    isOverInvalid={isOver && !overIsCurrent}
                    isMidSpan={midSpanCells.has(di)}
                    onClick={(anchor) => onDayClick(dateStr, anchor)}
                    onOverflowClick={onOverflowClick ? (anchor) => onOverflowClick(dateStr, dayItems, anchor) : undefined}
                  />
                )
              })}

              <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ top: 38, zIndex: 10 }}>
                {laned.filter((seg) => seg.lane < LANES_MAX).map((seg) => (
                  <EventBar
                    key={`${seg.item.id}-w${wi}`}
                    item={seg.item}
                    startIdx={seg.startIdx}
                    endIdx={seg.endIdx}
                    lane={seg.lane}
                    spansLeft={seg.spansLeft}
                    spansRight={seg.spansRight}
                    isDragging={draggedId === seg.item.id}
                    onItemClick={onItemClick}
                    onResizeStart={onResizeStart}
                    onDragStart={onDragStart}
                    onNudge={onItemNudge}
                    onCycleStatus={onCycleStatus}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
