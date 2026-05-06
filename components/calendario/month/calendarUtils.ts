import type { GridCell } from '@/lib/types'

export const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const LANE_HEIGHT = 24
export const LANES_MAX = 3

export function getMonthGrid(year: number, month: number): GridCell[][] {
  const firstDay = new Date(year, month, 1)
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: GridCell[] = []

  for (let i = startOffset; i > 0; i--)
    cells.push({ date: new Date(year, month, 1 - i), isCurrent: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), isCurrent: true })
  let next = 1
  while (cells.length % 7 !== 0)
    cells.push({ date: new Date(year, month + 1, next++), isCurrent: false })

  const weeks: GridCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, days: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

export function assignLanes<T extends { startIdx: number; endIdx: number }>(
  events: T[],
): (T & { lane: number })[] {
  const lanes: number[] = []
  const sorted = [...events].sort((a, b) => a.startIdx - b.startIdx || b.endIdx - a.endIdx)
  return sorted.map((e) => {
    let lane = lanes.findIndex((last) => last < e.startIdx)
    if (lane === -1) {
      lane = lanes.length
      lanes.push(e.endIdx)
    } else {
      lanes[lane] = e.endIdx
    }
    return { ...e, lane }
  })
}
