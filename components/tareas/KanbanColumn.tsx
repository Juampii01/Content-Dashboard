'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Task, TaskColumnId } from '@/lib/types'
import { TaskCard } from './TaskCard'

interface KanbanColumnProps {
  id: TaskColumnId
  title: string
  tasks: Task[]
  accentColor: string
  onAddTask: (columnId: TaskColumnId) => void
  onEditTask: (task: Task) => void
}

export function KanbanColumn({ id, title, tasks, accentColor, onAddTask, onEditTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col min-h-0" style={{ minWidth: 0 }}>
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {title}
          </span>
          <span
            className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(id)}
          aria-label={`Añadir tarea en ${title}`}
          className="p-1 rounded-lg transition-all hover:opacity-70 hover:rotate-90 duration-200"
          title="Añadir tarea"
        >
          <Plus size={14} style={{ color: 'var(--muted-foreground)' }} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-2 rounded-xl p-2 transition-colors min-h-[120px]"
        style={{
          backgroundColor: isOver ? accentColor + '0D' : 'var(--muted)',
          border: `1px dashed ${isOver ? accentColor + '66' : 'transparent'}`,
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onEditTask} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <button
            onClick={() => onAddTask(id)}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 text-xs rounded-lg transition-all duration-200 py-6 group"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <Plus
              size={16}
              className="transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-0.5"
              style={{ color: accentColor, opacity: 0.5 }}
            />
            <span className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100 opacity-60">
              + Añadir tarea
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
