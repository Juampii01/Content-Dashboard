'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, User } from 'lucide-react'
import { Task } from '@/lib/types'
import { LabelBadge } from './LabelBadge'
import { formatDate } from '@/lib/utils/formatDate'
import { useAuth } from '@/components/layout/AuthProvider'

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { profile } = useAuth()
  const isMine = !!task.assignedTo && task.assignedTo === profile?.userId
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const dndTransform = CSS.Transform.toString(transform)

  // Normal state has NO inline backgroundColor → lets .interactive-card CSS :hover take effect.
  // Drag/transition states set it explicitly to prevent CSS background-color from animating
  // during dnd-kit's drop animation.
  const style: React.CSSProperties = isDragging ? {
    backgroundColor: 'var(--card)',
    transform: `${dndTransform ?? ''} scale(1.04) rotate(1.5deg)`.trim(),
    boxShadow: 'var(--shadow-drag)',
    borderColor: 'var(--accent)',
    zIndex: 50,
    opacity: 0.95,
  } : transition ? {
    backgroundColor: 'var(--card)',
    transform: dndTransform || undefined,
    transition,
  } : {}

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.columnId !== 'listo'
  const dueDateFormatted = task.dueDate
    ? formatDate(task.dueDate + 'T00:00:00')
    : null

  // Whole card is the drag source. dnd-kit's PointerSensor with `activationConstraint:
  // { distance: 8 }` distinguishes click (opens modal) from drag (>= 8px movement).
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="rounded-xl p-3 cursor-grab active:cursor-grabbing group interactive-card"
      onClick={() => onClick(task)}
    >
      {/* Label */}
      {task.label && (
        <div className="mb-1.5">
          <LabelBadge label={task.label} small />
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          {task.description}
        </p>
      )}

      {/* Bottom row: due date + assignee indicator */}
      {(dueDateFormatted || task.assignedTo) && (
        <div className="flex items-center justify-between gap-2 mt-2">
          {dueDateFormatted ? (
            <div className="flex items-center gap-1">
              <Calendar size={11} style={{ color: isOverdue ? '#E05252' : 'var(--muted-foreground)' }} />
              <span
                className="text-[11px]"
                style={{ color: isOverdue ? '#E05252' : 'var(--muted-foreground)' }}
              >
                {dueDateFormatted}
              </span>
            </div>
          ) : <span />}
          {task.assignedTo && (
            <span
              title={isMine ? 'Asignada a vos' : 'Asignada a otro miembro'}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full"
              style={{
                backgroundColor: isMine
                  ? 'color-mix(in srgb, var(--accent) 18%, transparent)'
                  : 'var(--muted)',
                color: isMine ? 'var(--accent)' : 'var(--muted-foreground)',
                border: '1px solid var(--border)',
              }}
            >
              <User size={10} />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
