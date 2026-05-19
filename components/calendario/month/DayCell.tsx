'use client'

import { useState } from 'react'
import { LANE_HEIGHT } from './calendarUtils'

interface DayCellProps {
  dateStr: string
  isToday: boolean
  isCurrent: boolean
  date: Date
  lane: number
  overflow: number
  isOver?: boolean
  isOverInvalid?: boolean
  isMidSpan?: boolean
  onClick: (anchor: { x: number; y: number }) => void
  onOverflowClick?: (anchor: { x: number; y: number }) => void
}

export function DayCell({ dateStr, isToday, isCurrent, date, lane, overflow, isOver, isMidSpan, onClick, onOverflowClick }: DayCellProps) {
  const [isHovered, setIsHovered] = useState(false)
  const showOverHalo = isOver && isCurrent
  const showInvalid = isOver && !isCurrent

  const bg = showOverHalo
    ? 'color-mix(in srgb, var(--accent) 14%, var(--card))'
    : 'var(--card)'

  const border = showOverHalo
    ? '2px solid var(--accent)'
    : isCurrent && !isMidSpan
      ? '1px solid var(--border)'
      : '1px solid transparent'

  const hoverScale = isHovered && isCurrent && !isOver ? 'scale(1.03)' : 'scale(1)'

  return (
    <div
      data-date={dateStr}
      data-current={isCurrent ? 'true' : 'false'}
      onClick={isCurrent ? (e) => onClick({ x: e.clientX, y: e.clientY }) : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`min-h-[80px] rounded-lg pt-2 px-2 pb-1.5 flex flex-col${isToday && isCurrent ? ' today-glow' : ''}`}
      style={{
        backgroundColor: bg,
        border,
        boxShadow: showOverHalo
          ? '0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent), 0 6px 16px color-mix(in srgb, var(--accent) 18%, transparent)'
          : (showInvalid ? '0 0 0 2px color-mix(in srgb, #ef4444 55%, transparent)' : 'none'),
        opacity: isCurrent ? 1 : 0.38,
        cursor: showInvalid ? 'not-allowed' : (isCurrent ? 'pointer' : 'default'),
        transform: hoverScale,
        transition: 'background-color 180ms cubic-bezier(0.16,1,0.3,1), box-shadow 180ms cubic-bezier(0.16,1,0.3,1), border-color 180ms cubic-bezier(0.16,1,0.3,1), transform 200ms var(--ease-spring)',
      }}
    >
      <span
        className="text-[13px] self-start leading-none mb-1.5 w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          fontWeight: isToday ? 700 : 600,
          backgroundColor: isToday ? 'var(--accent)' : 'transparent',
          color: isToday
            ? '#fff'
            : (isCurrent ? 'var(--foreground)' : 'var(--muted-foreground)'),
          letterSpacing: '-0.01em',
        }}
      >
        {date.getDate()}
      </span>
      <div style={{ height: lane * LANE_HEIGHT }} />
      {overflow > 0 && (
        <button
          type="button"
          data-overflow="true"
          aria-label={`Ver ${overflow} items adicionales`}
          onClick={(e) => {
            e.stopPropagation()
            if (onOverflowClick) {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              onOverflowClick({ x: rect.left, y: rect.bottom })
            }
          }}
          className="text-[10px] mt-auto self-start px-1.5 py-0.5 rounded-full font-semibold cursor-pointer transition-all focus-visible:outline-none"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--accent)',
            border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.backgroundColor = 'color-mix(in srgb, var(--accent) 14%, var(--muted))'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.backgroundColor = 'var(--muted)'
          }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px var(--accent)' }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
        >
          +{overflow} más
        </button>
      )}
    </div>
  )
}
