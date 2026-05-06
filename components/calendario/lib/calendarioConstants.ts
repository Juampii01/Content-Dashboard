import { Circle, CircleDashed, Flag, Check } from 'lucide-react'
import { ContentCategory, UnifiedStatus } from '@/lib/types'

export type ViewMode = 'month' | 'week'

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const STATUSES: UnifiedStatus[] = ['drafts', 'en-proceso', 'programado', 'publicado']

export const STATUS_META: Record<UnifiedStatus, { label: string; Icon: typeof Circle; color: string }> = {
  drafts:       { label: 'Drafts',     Icon: Circle,       color: '#6B7280' },
  'en-proceso': { label: 'En proceso', Icon: CircleDashed, color: '#B08A4A' },
  programado:   { label: 'Programado', Icon: Flag,         color: '#5B8DEF' },
  publicado:    { label: 'Publicado',  Icon: Check,        color: '#10B981' },
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function formatWeekRange(start: Date): string {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('es-ES', opts)} – ${end.toLocaleDateString('es-ES', opts)}`
}

export const REEL_CATEGORIES: ContentCategory[] = ['viral', 'nicho']
export const HISTORIA_CATEGORIES: ContentCategory[] = ['lifestyle', 'dolor', 'deseo']
