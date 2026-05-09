'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ContentItem } from '@/lib/types'
import { MonthGrid } from './month/MonthGrid'
import { getMonthGrid, toDateStr, addDays, daysBetween, parseDate } from './month/calendarUtils'

interface CalendarMonthViewProps {
  year: number
  month: number
  items: ContentItem[]
  onDayClick: (date: string, anchor: { x: number; y: number }) => void
  onItemClick: (item: ContentItem) => void
  onItemResize: (id: string, startDate: string, endDate: string) => void
  navDirection?: 'forward' | 'back'
  onOverflowClick?: (dateStr: string, dayItems: ContentItem[], anchor: { x: number; y: number }) => void
  onCycleStatus?: (id: string) => void
  onDuplicate?: (id: string) => void
  onDelete?: (id: string) => void
}

const DRAG_THRESHOLD = 5 // px

export function CalendarMonthView({
  year, month, items, onDayClick, onItemClick, onItemResize,
  navDirection = 'forward',
  onOverflowClick, onCycleStatus, onDuplicate, onDelete,
}: CalendarMonthViewProps) {
  const weeks = getMonthGrid(year, month)
  const today = toDateStr(new Date())

  const [dragPreview, setDragPreview] = useState<{ id: string; start: string; end: string } | null>(null)
  const dragPreviewRef = useRef<{ id: string; start: string; end: string } | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [overDate, setOverDate] = useState<string | null>(null)
  const [overIsCurrent, setOverIsCurrent] = useState<boolean>(true)

  // Ghost tracking for portal
  const [ghost, setGhost] = useState<{ x: number; y: number; width: number; height: number; item: ContentItem } | null>(null)
  const ghostRef = useRef<{ x: number; y: number; width: number; height: number; item: ContentItem } | null>(null)

  // Suppresses the next click on a DayCell after a drag release
  const justDraggedRef = useRef<boolean>(false)

  const [isMounted, setIsMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mount gate
  useEffect(() => { setIsMounted(true) }, [])

  const getDateFromPoint = useCallback((x: number, y: number): { date: string; isCurrent: boolean } | null => {
    const els = document.elementsFromPoint(x, y)
    const cell = els.find(el => (el as HTMLElement).dataset.date) as HTMLElement | undefined
    if (!cell) return null
    return {
      date: cell.dataset.date!,
      isCurrent: cell.dataset.current !== 'false',
    }
  }, [])

  const handleDragStart = useCallback((
    e: React.PointerEvent,
    item: ContentItem,
    grabOffset: number,
  ) => {
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const originEl = e.currentTarget as HTMLElement
    const originRect = originEl.getBoundingClientRect()
    const pointerId = e.pointerId
    let started = false
    const duration = daysBetween(item.date, item.endDate ?? item.date)

    const beginDrag = () => {
      started = true
      setDraggedId(item.id)
      // Initialize ghost at pointer position
      const ghostData = {
        x: startX - (startX - originRect.left),
        y: startY - (startY - originRect.top),
        width: originRect.width,
        height: originRect.height,
        item,
      }
      ghostRef.current = ghostData
      setGhost(ghostData)
      try { originEl.setPointerCapture?.(pointerId) } catch {}
    }

    const onMove = (ev: PointerEvent) => {
      if (!started) {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return
        beginDrag()
      }

      // Update ghost position (fixed to cursor with same relative offset)
      const offsetX = startX - originRect.left
      const offsetY = startY - originRect.top
      const g = ghostRef.current
      if (g) {
        const next = { ...g, x: ev.clientX - offsetX, y: ev.clientY - offsetY }
        ghostRef.current = next
        setGhost(next)
      }

      const hit = getDateFromPoint(ev.clientX, ev.clientY)
      if (!hit) return
      setOverDate(hit.date)
      setOverIsCurrent(hit.isCurrent)
      if (!hit.isCurrent) return // don't project onto non-current days
      const newStart = addDays(hit.date, -grabOffset)
      const newEnd = addDays(newStart, duration)
      dragPreviewRef.current = { id: item.id, start: newStart, end: newEnd }
      setDragPreview({ ...dragPreviewRef.current })
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)

      if (!started) {
        // Pure click — no state to reset, allow onClick on EventBar to proceed
        return
      }

      // Mark so DayCell under pointer ignores the synthetic click that follows
      justDraggedRef.current = true
      // Clear on next tick
      setTimeout(() => { justDraggedRef.current = false }, 0)

      setDraggedId(null)
      setOverDate(null)
      setOverIsCurrent(true)
      setGhost(null)
      ghostRef.current = null
      const pending = dragPreviewRef.current
      dragPreviewRef.current = null
      setDragPreview(null)

      if (pending && pending.id === item.id) {
        const newStart = pending.start
        const newEnd = pending.end
        if (newStart !== item.date || newEnd !== (item.endDate ?? item.date)) {
          onItemResize(item.id, newStart, newEnd)
        }
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }, [getDateFromPoint, onItemResize])

  const handleResizeStart = useCallback((
    e: React.PointerEvent,
    item: ContentItem,
    side: 'start' | 'end',
  ) => {
    e.stopPropagation()
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    const weekRow = target.closest('[data-week-row]') as HTMLElement | null
    const cellW = weekRow ? weekRow.getBoundingClientRect().width / 7 : 0
    if (!cellW) return
    const startX = e.clientX
    const originalStart = item.date
    const originalEnd = item.endDate ?? item.date
    try { target.setPointerCapture(e.pointerId) } catch {}

    const onMove = (ev: PointerEvent) => {
      const deltaDays = Math.round((ev.clientX - startX) / cellW)
      let newStart = originalStart
      let newEnd = originalEnd
      if (side === 'start') {
        newStart = addDays(originalStart, deltaDays)
        if (parseDate(newStart) > parseDate(newEnd)) newStart = newEnd
      } else {
        newEnd = addDays(originalEnd, deltaDays)
        if (parseDate(newEnd) < parseDate(newStart)) newEnd = newStart
      }
      dragPreviewRef.current = { id: item.id, start: newStart, end: newEnd }
      setDragPreview(dragPreviewRef.current)
    }
    const onUp = () => {
      const pending = dragPreviewRef.current
      dragPreviewRef.current = null
      setDragPreview(null)
      if (pending && pending.id === item.id) onItemResize(item.id, pending.start, pending.end)
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
  }, [onItemResize])

  const handleItemNudge = useCallback((item: ContentItem, delta: number) => {
    const newStart = addDays(item.date, delta)
    const newEnd = addDays(item.endDate ?? item.date, delta)
    onItemResize(item.id, newStart, newEnd)
  }, [onItemResize])

  // Wrap onDayClick to swallow the click immediately following a drop
  const handleDayClick = useCallback((date: string, anchor: { x: number; y: number }) => {
    if (justDraggedRef.current) return
    onDayClick(date, anchor)
  }, [onDayClick])

  return (
    <>
      <MonthGrid
        year={year}
        month={month}
        weeks={weeks}
        items={items}
        today={today}
        dragPreview={dragPreview}
        draggedId={draggedId}
        overDate={overDate}
        overIsCurrent={overIsCurrent}
        navDirection={navDirection}
        onDayClick={handleDayClick}
        onItemClick={onItemClick}
        onResizeStart={handleResizeStart}
        onDragStart={handleDragStart}
        onItemNudge={handleItemNudge}
        onOverflowClick={onOverflowClick}
        onCycleStatus={onCycleStatus}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
      {isMounted && ghost && createPortal(
        <div
          aria-hidden
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: ghost.width,
            height: ghost.height,
            transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0)`,
            pointerEvents: 'none',
            zIndex: 9999,
            backgroundColor: ghost.item.color + '28',
            color: ghost.item.color,
            borderLeft: `3px solid ${ghost.item.color}`,
            borderRadius: 4,
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1.1,
            boxShadow: 'var(--shadow-card-md)',
            opacity: 0.95,
            cursor: overIsCurrent ? 'grabbing' : 'not-allowed',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {ghost.item.title}
        </div>,
        document.body,
      )}
    </>
  )
}
