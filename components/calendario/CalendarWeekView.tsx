'use client'

import { ContentItem } from '@/lib/types'

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface CalendarWeekViewProps {
  weekStart: Date
  items: ContentItem[]
  onDayClick: (date: string) => void
  onItemClick: (item: ContentItem) => void
}

function toDateStr(date: Date) {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function CalendarWeekView({ weekStart, items, onDayClick, onItemClick }: CalendarWeekViewProps) {
  const today = toDateStr(new Date())

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const itemsByDate: Record<string, ContentItem[]> = {}
  for (const item of items) {
    const start = new Date(item.date)
    const end = new Date(item.endDate ?? item.date)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = toDateStr(d)
      if (!itemsByDate[key]) itemsByDate[key] = []
      itemsByDate[key].push(item)
    }
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((date, i) => {
        const dateStr = toDateStr(date)
        const dayItems = itemsByDate[dateStr] ?? []
        const isToday = dateStr === today

        return (
          <div
            key={i}
            onClick={() => onDayClick(dateStr)}
            className="rounded-xl p-3 cursor-pointer transition-all hover:opacity-90 min-h-[160px] flex flex-col"
            style={{
              backgroundColor: 'var(--card)',
              border: isToday ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}
          >
            {/* Day header */}
            <div className="flex flex-col items-center mb-3">
              <span className="text-[11px] font-semibold mb-1" style={{ color: 'var(--muted-foreground)' }}>
                {DAY_NAMES[i]}
              </span>
              <span
                className="text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: isToday ? 'var(--accent)' : 'transparent',
                  color: isToday ? '#fff' : 'var(--foreground)',
                }}
              >
                {date.getDate()}
              </span>
            </div>

            {/* Items */}
            <div className="flex flex-col gap-1.5 flex-1">
              {dayItems.map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => { e.stopPropagation(); onItemClick(item) }}
                  className="text-left text-[11px] px-2 py-1.5 rounded-lg font-medium leading-tight transition-all hover:opacity-80 w-full"
                  style={{ backgroundColor: item.color + '33', color: item.color, border: `1px solid ${item.color}44` }}
                >
                  {item.title}
                </button>
              ))}

              {dayItems.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-[10px] opacity-30" style={{ color: 'var(--muted-foreground)' }}>+</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
