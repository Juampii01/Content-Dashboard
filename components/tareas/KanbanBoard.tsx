'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { AnimatePresence } from 'motion/react'
import { Plus, CheckSquare } from 'lucide-react'
import { Task, TaskColumnId } from '@/lib/types'
import { KANBAN_COLUMNS } from './constants'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { TaskModal } from './TaskModal'
import { PageHeader } from '@/components/ui/PageHeader'
import { toast } from 'sonner'

// ─── API shape ─────────────────────────────────────────────────────────────

interface ApiTask {
  id: string
  title: string
  description: string
  dueDate: string | null
  labelText: string
  labelColor: string
  columnId: string
  order: number
  createdAt: string
  updatedAt: string
}

function apiToUiTask(t: ApiTask): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description || undefined,
    dueDate: t.dueDate
      ? new Date(t.dueDate).toISOString().slice(0, 10)
      : undefined,
    label:
      t.labelText && t.labelColor
        ? { text: t.labelText, color: t.labelColor }
        : undefined,
    columnId: t.columnId as TaskColumnId,
    createdAt: t.createdAt,
    order: t.order,
  }
}

// ─── KanbanBoard ───────────────────────────────────────────────────────────

export function KanbanBoard() {
  const [tasks, setTasks]         = useState<Task[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [modalConfig, setModalConfig] = useState<{
    open: boolean
    task?: Task | null
    defaultColumnId?: TaskColumnId
  }>({ open: false })

  // Pending reorder batch — debounced 60 ms to allow rapid drags to coalesce.
  const reorderPendingRef = useRef<Task[] | null>(null)
  const reorderTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Initial fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/tasks')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ tasks: ApiTask[] }>
      })
      .then(({ tasks: apiTasks }) => {
        if (!cancelled) setTasks(apiTasks.map(apiToUiTask))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          toast.error(`Error al cargar tareas: ${msg}`)
          setLoadError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // ── Batch persist helper ──────────────────────────────────────────────────

  /**
   * Debounced batch PATCH. When multiple drags happen quickly we accumulate
   * and send a single request, 60 ms after the last drag ends.
   */
  function scheduleBatchReorder(updatedTasks: Task[]) {
    reorderPendingRef.current = updatedTasks
    if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current)
    reorderTimerRef.current = setTimeout(() => {
      const snapshot = reorderPendingRef.current
      reorderPendingRef.current = null
      if (!snapshot) return

      // Only send tasks that have a changed position
      const payload = snapshot.map((t) => ({
        id: t.id,
        columnId: t.columnId,
        order: t.order,
      }))

      fetch('/api/tasks/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: payload }),
      }).catch(() => toast.error('Error al guardar el orden'))
    }, 60)
  }

  // ── DnD sensors ──────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId   = over.id as string

    const activeTask = tasks.find((t) => t.id === activeId)
    if (!activeTask) return

    const overColumn = KANBAN_COLUMNS.find((c) => c.id === overId)
    if (overColumn && activeTask.columnId !== overColumn.id) {
      setTasks((prev) =>
        prev.map((t) => t.id === activeId ? { ...t, columnId: overColumn.id } : t),
      )
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const activeId = active.id as string
    const overId   = over.id as string

    if (activeId === overId) return

    setTasks((prev) => {
      const activeTask  = prev.find((t) => t.id === activeId)
      const overTask    = prev.find((t) => t.id === overId)
      const overColumn  = KANBAN_COLUMNS.find((c) => c.id === overId)

      if (!activeTask) return prev

      let updated = prev

      if (overColumn) {
        // Dropped on an empty column zone: move card to end of that column
        const colItems = prev.filter((t) => t.columnId === overColumn.id && t.id !== activeId)
        updated = prev.map((t) =>
          t.id === activeId
            ? { ...t, columnId: overColumn.id, order: colItems.length }
            : t,
        )
      } else if (overTask) {
        const sameCol = activeTask.columnId === overTask.columnId
        if (sameCol) {
          // Same-column reorder
          const colTasks  = prev.filter((t) => t.columnId === activeTask.columnId)
          const activeIdx = colTasks.findIndex((t) => t.id === activeId)
          const overIdx   = colTasks.findIndex((t) => t.id === overId)
          const reordered = arrayMove(colTasks, activeIdx, overIdx).map((t, i) => ({
            ...t,
            order: i,
          }))
          updated = [...prev.filter((t) => t.columnId !== activeTask.columnId), ...reordered]
        } else {
          // Cross-column: insert active at overTask's position in target column
          const targetColTasks = prev
            .filter((t) => t.columnId === overTask.columnId && t.id !== activeId)
            .sort((a, b) => a.order - b.order)
          const overIdx        = targetColTasks.findIndex((t) => t.id === overId)
          const insertAt       = overIdx === -1 ? targetColTasks.length : overIdx
          const reinserted     = [
            ...targetColTasks.slice(0, insertAt),
            { ...activeTask, columnId: overTask.columnId },
            ...targetColTasks.slice(insertAt),
          ].map((t, i) => ({ ...t, order: i }))

          updated = [
            ...prev.filter((t) => t.columnId !== overTask.columnId && t.id !== activeId),
            ...reinserted,
          ]
        }
      }

      // Batch persist — only changed tasks
      const changed = updated.filter((t) => {
        const orig = prev.find((p) => p.id === t.id)
        return orig && (orig.columnId !== t.columnId || orig.order !== t.order)
      })
      if (changed.length > 0) scheduleBatchReorder(changed)

      return updated
    })
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openCreateModal = (columnId: TaskColumnId = 'por-hacer') => {
    setModalConfig({ open: true, task: null, defaultColumnId: columnId })
  }

  const openEditModal = useCallback((task: Task) => {
    setModalConfig({ open: true, task })
  }, [])

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (data: Omit<Task, 'id' | 'createdAt' | 'order'> & { id?: string }) => {
      if (data.id) {
        // ─ Update ─
        try {
          const res = await fetch(`/api/tasks/${data.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title:       data.title,
              description: data.description ?? '',
              dueDate:     data.dueDate ? new Date(data.dueDate + 'T00:00:00').toISOString() : null,
              labelText:   data.label?.text  ?? '',
              labelColor:  data.label?.color ?? '',
              columnId:    data.columnId,
            }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const { task: apiTask } = (await res.json()) as { task: ApiTask }
          setTasks((prev) =>
            prev.map((t) => t.id === data.id ? apiToUiTask(apiTask) : t),
          )
          toast.success('Tarea actualizada')
        } catch (err: unknown) {
          toast.error(`Error al actualizar: ${err instanceof Error ? err.message : String(err)}`)
        }
      } else {
        // ─ Create ─
        try {
          const colTasks = tasks.filter((t) => t.columnId === data.columnId)
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title:       data.title,
              description: data.description ?? '',
              dueDate:     data.dueDate ? new Date(data.dueDate + 'T00:00:00').toISOString() : null,
              labelText:   data.label?.text  ?? '',
              labelColor:  data.label?.color ?? '',
              columnId:    data.columnId,
              order:       colTasks.length,
            }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const { task: apiTask } = (await res.json()) as { task: ApiTask }
          setTasks((prev) => [...prev, apiToUiTask(apiTask)])
          toast.success('Tarea creada')
        } catch (err: unknown) {
          toast.error(`Error al crear: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    },
    [tasks],
  )

  const handleQuickAdd = useCallback(
    async (columnId: TaskColumnId, title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return
      try {
        const colTasks = tasks.filter((t) => t.columnId === columnId)
        // Optimistic add so the card appears instantly
        const tempId = `temp-${Date.now()}`
        const optimistic: Task = {
          id:        tempId,
          title:     trimmed,
          columnId,
          order:     colTasks.length,
          createdAt: new Date().toISOString(),
        }
        setTasks((prev) => [...prev, optimistic])

        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: trimmed,
            description: '',
            columnId,
            order: colTasks.length,
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { task: apiTask } = (await res.json()) as { task: ApiTask }
        // Replace optimistic card with real one
        setTasks((prev) => prev.map((t) => t.id === tempId ? apiToUiTask(apiTask) : t))
      } catch (err: unknown) {
        // Rollback optimistic card
        setTasks((prev) => prev.filter((t) => !t.id.startsWith('temp-')))
        toast.error(`Error al crear: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
    [tasks],
  )

  const handleComplete = useCallback(
    async (task: Task) => {
      const targetCol: TaskColumnId = task.columnId === 'listo' ? 'por-hacer' : 'listo'
      // Optimistic update
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, columnId: targetCol } : t))
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnId: targetCol }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch {
        // Rollback
        setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, columnId: task.columnId } : t))
        toast.error('Error al actualizar tarea')
      }
    },
    [],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      const deleted = tasks.find((t) => t.id === id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        if (deleted) {
          toast.success('Tarea eliminada', {
            action: {
              label: 'Deshacer',
              onClick: async () => {
                try {
                  const r = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title:       deleted.title,
                      description: deleted.description ?? '',
                      dueDate:     deleted.dueDate
                        ? new Date(deleted.dueDate + 'T00:00:00').toISOString()
                        : null,
                      labelText:   deleted.label?.text  ?? '',
                      labelColor:  deleted.label?.color ?? '',
                      columnId:    deleted.columnId,
                      order:       deleted.order,
                    }),
                  })
                  if (!r.ok) throw new Error(`HTTP ${r.status}`)
                  const { task: apiTask } = (await r.json()) as { task: ApiTask }
                  setTasks((prev) =>
                    [...prev, apiToUiTask(apiTask)].sort((a, b) => a.order - b.order),
                  )
                } catch {
                  toast.error('No se pudo deshacer')
                }
              },
            },
          })
        }
      } catch (err: unknown) {
        if (deleted) setTasks((prev) => [...prev, deleted].sort((a, b) => a.order - b.order))
        toast.error(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
    [tasks],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-shell flex flex-col h-full">
      <PageHeader
        eyebrow="Workflow"
        title="Tareas"
        description="Organizá tu flujo de trabajo de contenido."
        icon={CheckSquare}
        actions={
          <button
            onClick={() => openCreateModal()}
            className="btn btn-primary"
          >
            <Plus size={15} />
            Nueva tarea
          </button>
        }
      />

      {loading ? (
        <KanbanSkeleton />
      ) : loadError && tasks.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm"
          style={{ color: 'var(--muted-foreground)' }}>
          Error al cargar las tareas. Recargá la página para intentar de nuevo.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex xl:grid xl:grid-cols-3 gap-5 flex-1 min-h-0 overflow-x-auto xl:overflow-x-visible -mx-6 px-6 xl:mx-0 xl:px-0">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = tasks
                .filter((t) => t.columnId === col.id)
                .sort((a, b) => a.order - b.order)
              return (
                <div key={col.id} className="shrink-0 xl:shrink w-[280px] xl:w-auto min-h-0 flex flex-col">
                  <KanbanColumn
                    id={col.id}
                    title={col.label}
                    tasks={colTasks}
                    accentColor={col.color}
                    onAddTask={openCreateModal}
                    onEditTask={openEditModal}
                    onQuickAdd={handleQuickAdd}
                    onComplete={handleComplete}
                  />
                </div>
              )
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <div style={{ transform: 'rotate(2deg)', opacity: 0.95 }}>
                <TaskCard
                  task={activeTask}
                  onClick={() => {}}
                  onComplete={() => {}}
                  isOverlay
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <AnimatePresence>
        {modalConfig.open && (
          <TaskModal
            key="task-modal"
            task={modalConfig.task}
            defaultColumnId={modalConfig.defaultColumnId}
            onSave={handleSave}
            onDelete={modalConfig.task ? handleDelete : undefined}
            onClose={() => setModalConfig({ open: false })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div className="flex xl:grid xl:grid-cols-3 gap-5 flex-1 min-h-0 overflow-x-auto xl:overflow-x-visible -mx-6 px-6 xl:mx-0 xl:px-0">
      {KANBAN_COLUMNS.map((col) => (
        <div key={col.id} className="shrink-0 xl:shrink w-[280px] xl:w-auto flex flex-col gap-2">
          {/* Column header skeleton */}
          <div className="flex items-center gap-2 mb-1 px-1">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: col.color, opacity: 0.4 }} />
            <div className="h-3 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-3 w-5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
          {/* Card skeletons */}
          <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--muted)' }}>
            {[1, 2, col.id === 'en-proceso' ? 3 : 0].filter(Boolean).map((i) => (
              <div
                key={i}
                className="rounded-xl p-3 mb-2 last:mb-0"
                style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="h-2.5 w-16 rounded-full mb-2 animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
                <div className="h-3 w-full rounded animate-pulse mb-1.5" style={{ backgroundColor: 'var(--muted)' }} />
                <div className="h-3 w-3/4 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
