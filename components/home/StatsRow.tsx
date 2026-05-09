'use client'

import { useContentItems } from '@/hooks/useContentItems'

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function getWeekDates(): string[] {
  const monday = getMondayOfWeek(new Date())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

interface Stat {
  label: string
  value: number
  color: string
  description: string
}

export function StatsRow() {
  const { items } = useContentItems()

  const weekDates = new Set(getWeekDates())

  const contentThisWeek = items.filter(
    (i) => i.date && weekDates.has(i.date)
  ).length

  const pending = items.filter((i) => i.status !== 'publicado').length
  const published = items.filter((i) => i.status === 'publicado').length

  const stats: Stat[] = [
    { label: 'Contenido esta semana', value: contentThisWeek, color: 'var(--stat-icon)', description: 'programado' },
    { label: 'En pipeline', value: pending, color: 'var(--accent)', description: 'piezas activas' },
    { label: 'Publicados', value: published, color: 'var(--stat-icon-secondary)', description: 'totales' },
  ]

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl p-4 card-lift"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>{stat.label}</p>
          <p className="text-3xl font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{stat.description}</p>
        </div>
      ))}
    </div>
  )
}
