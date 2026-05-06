'use client'

import { useContentItems } from '@/hooks/useContentItems'
import { FORMAT_ICONS, CATEGORY_COLORS } from '@/components/pipeline/CategoryChip'

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

interface AgendaItem {
  id: string
  title: string
  icon: string
  color: string
  status: string
}

export function WeekAgenda() {
  const { items } = useContentItems()

  const monday = getMondayOfWeek(new Date())
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })

  const days = week.map((date) => {
    const dateStr = date.toISOString().split('T')[0]
    const dayItems: AgendaItem[] = items
      .filter((p) => p.date === dateStr)
      .map((p) => ({
        id: p.id,
        title: p.title,
        icon: p.format ? (FORMAT_ICONS[p.format] ?? (p.type === 'reel' ? '🎬' : '⏱️')) : (p.type === 'reel' ? '🎬' : '⏱️'),
        color: p.color ?? (p.category ? (CATEGORY_COLORS[p.category] ?? 'var(--accent)') : 'var(--accent)'),
        status: p.status === 'publicado' ? 'PUBLICADO' : p.status === 'programado' ? 'PROGRAMADO' : p.status.toUpperCase(),
      }))

    return { date, dateStr, items: dayItems }
  })

  const today = new Date().toISOString().split('T')[0]

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
    >
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Esta semana</h2>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {days.map(({ date, dateStr, items }, i) => {
          const isToday = dateStr === today
          return (
            <div key={dateStr} className="flex items-start gap-4 px-5 py-3">
              <div className="flex-shrink-0 w-14 text-right">
                <p className="text-[11px] font-medium" style={{ color: isToday ? 'var(--accent)' : 'var(--muted-foreground)' }}>
                  {DAY_NAMES[i]}
                </p>
                <p className="text-lg font-bold leading-tight"
                  style={{ color: isToday ? 'var(--accent)' : 'var(--foreground)' }}>
                  {date.getDate()}
                </p>
              </div>

              <div className="w-px self-stretch" style={{ backgroundColor: isToday ? 'var(--accent)' : 'var(--border)' }} />

              <div className="flex-1 py-1">
                {items.length > 0 ? (
                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span style={{ color: item.color }}>{item.icon}</span>
                        <p className="text-sm flex-1" style={{ color: 'var(--foreground)' }}>{item.title}</p>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color + '22', color: item.color }}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs py-0.5" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>
                    Sin contenido programado
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
