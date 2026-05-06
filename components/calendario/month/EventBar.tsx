'use client'

import type { ContentItem } from '@/lib/types'
import { Check, Circle, CircleDashed, Flag } from 'lucide-react'
import { LANE_HEIGHT } from './calendarUtils'
import { QuickActions } from './QuickActions'

interface EventBarProps {
  item: ContentItem
  startIdx: number
  endIdx: number
  lane: number
  spansLeft: boolean
  spansRight: boolean
  isDragging?: boolean
  onItemClick: (item: ContentItem) => void
  onResizeStart: (e: React.PointerEvent, item: ContentItem, side: 'start' | 'end') => void
  onDragStart: (e: React.PointerEvent, item: ContentItem, grabOffset: number) => void
  onNudge?: (item: ContentItem, delta: number) => void
  onCycleStatus?: (id: string) => void
  onDuplicate?: (id: string) => void
  onDelete?: (id: string) => void
}

function StatusIcon({ status, color }: { status: ContentItem['status']; color: string }) {
  const common = { size: 10, strokeWidth: 2.5, style: { color, flexShrink: 0 } }
  switch (status) {
    case 'publicado':  return <Check {...common} />
    case 'programado': return <Flag {...common} />
    case 'en-proceso': return <CircleDashed {...common} />
    case 'drafts':
    default:           return <Circle {...common} />
  }
}

const STATUS_OVERRIDE_COLORS: Record<ContentItem['status'], string> = {
  drafts:       '#6B7280',
  'en-proceso': '#B08A4A',
  programado:   '#5B8DEF',
  publicado:    '#10B981',
}

export function EventBar({
  item, startIdx, endIdx, lane, spansLeft, spansRight, isDragging,
  onItemClick, onResizeStart, onDragStart, onNudge,
  onCycleStatus, onDuplicate, onDelete,
}: EventBarProps) {
  const barColor = STATUS_OVERRIDE_COLORS[item.status]
  const leftPct = (startIdx / 7) * 100
  const widthPct = ((endIdx - startIdx + 1) / 7) * 100
  // 1px inset so the bar visually floats over the cell borders (Apple Calendar style)
  const BAR_INSET = 1

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (target.dataset.resize) return
    if (target.closest('[data-quick-action]')) return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const weekRow = (e.currentTarget as HTMLElement).closest('[data-week-row]') as HTMLElement | null
    const cellW = weekRow ? weekRow.getBoundingClientRect().width / 7 : 100
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const grabOffset = Math.max(0, Math.floor((e.clientX - r.left) / cellW))
    onDragStart(e, item, grabOffset)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onItemClick(item)
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && onNudge) {
      e.preventDefault()
      e.stopPropagation()
      onNudge(item, e.key === 'ArrowLeft' ? -1 : 1)
    }
  }

  const restShadow = 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.12)'
  const hoverShadow = (c: string) =>
    `inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px ${c}55, 0 2px 4px ${c}33`

  return (
    <div
      className="absolute pointer-events-auto flex items-center group"
      style={{
        left: `calc(${leftPct}% + ${BAR_INSET}px)`,
        width: `calc(${widthPct}% - ${BAR_INSET * 2}px)`,
        top: lane * LANE_HEIGHT + 4,
        height: LANE_HEIGHT - 2,
        opacity: isDragging ? 0.35 : 1,
        transition: 'opacity 120ms ease, transform 180ms cubic-bezier(0.16,1,0.3,1), box-shadow 180ms cubic-bezier(0.16,1,0.3,1)',
        touchAction: 'none',
        // Solid base so the bar fully covers cell borders behind it
        backgroundColor: 'var(--card)',
        borderRadius: 6,
      }}
      onPointerDown={handlePointerDown}
    >
      {!spansLeft && (
        <div
          data-resize="start"
          onPointerDown={(e) => { e.stopPropagation(); onResizeStart(e, item, 'start') }}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
          style={{ backgroundColor: barColor, borderRadius: '4px 0 0 4px', touchAction: 'none' }}
        />
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label={`${item.title}. Enter para abrir, flechas para mover un día.`}
        onClick={(e) => { e.stopPropagation(); if (!isDragging) onItemClick(item) }}
        onKeyDown={handleKeyDown}
        className="text-left truncate text-[12px] px-2 leading-tight w-full h-full select-none flex items-center gap-1.5 cursor-grab active:cursor-grabbing focus-visible:outline-none"
        style={{
          backgroundColor: `color-mix(in srgb, ${barColor} 18%, var(--card))`,
          color: barColor,
          fontWeight: 600,
          borderLeft: `4px solid ${barColor}`,
          borderTopLeftRadius: spansLeft ? 0 : 6,
          borderBottomLeftRadius: spansLeft ? 0 : 6,
          borderTopRightRadius: spansRight ? 0 : 6,
          borderBottomRightRadius: spansRight ? 0 : 6,
          boxShadow: restShadow,
          outline: 'none',
          touchAction: 'none',
          transform: 'translateY(0)',
          transition: 'transform 180ms cubic-bezier(0.16,1,0.3,1), box-shadow 180ms cubic-bezier(0.16,1,0.3,1), background-color 150ms ease',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px var(--background), 0 0 0 4px ${barColor}` }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = restShadow }}
        onMouseEnter={(e) => {
          if (isDragging) return
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(-1px)'
          el.style.boxShadow = hoverShadow(barColor)
          el.style.backgroundColor = `color-mix(in srgb, ${barColor} 28%, var(--card))`
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = restShadow
          el.style.backgroundColor = `color-mix(in srgb, ${barColor} 18%, var(--card))`
        }}
      >
        {item.emoji
          ? <span className="flex-shrink-0 text-[13px] leading-none">{item.emoji}</span>
          : <StatusIcon status={item.status} color={barColor} />
        }
        <span className="truncate">{item.title}</span>
      </div>

      {!spansRight && (
        <div
          data-resize="end"
          onPointerDown={(e) => { e.stopPropagation(); onResizeStart(e, item, 'end') }}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
          style={{ backgroundColor: barColor, borderRadius: '0 4px 4px 0', touchAction: 'none' }}
        />
      )}

      {!isDragging && !spansRight && onCycleStatus && onDuplicate && onDelete && (
        <QuickActions
          item={item}
          onCycleStatus={onCycleStatus}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}
