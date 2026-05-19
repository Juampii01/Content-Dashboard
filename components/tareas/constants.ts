/**
 * Single source of truth for Kanban column definitions.
 * Imported by KanbanBoard, KanbanColumn and TaskModal.
 */

import type { TaskColumnId } from '@/lib/types'

export const KANBAN_COLUMNS: {
  id: TaskColumnId
  label: string
  /** CSS custom-property string used as the column accent color */
  color: string
}[] = [
  { id: 'por-hacer', label: 'Por hacer',  color: 'var(--muted-foreground)' },
  { id: 'en-proceso', label: 'En proceso', color: 'var(--warning, #F59E0B)' },
  { id: 'listo',      label: 'Listo',      color: 'var(--success, #22C55E)' },
]
