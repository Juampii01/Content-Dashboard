'use client'

import { useState, useEffect } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay,
  DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import { ContentPiece, UnifiedStatus } from '@/lib/types'
import { PipelineCard } from './PipelineCard'
import { PipelineModal } from './PipelineModal'
import { toast } from 'sonner'

const COLUMNS: { id: UnifiedStatus; label: string; color: string }[] = [
  { id: 'drafts',      label: 'Drafts',       color: 'var(--muted-foreground)' },
  { id: 'en-proceso',  label: 'En proceso',   color: 'var(--warning)' },
  { id: 'programado',  label: 'Programado',   color: 'var(--accent)' },
  { id: 'publicado',   label: 'Publicado',    color: 'var(--success)' },
]

// ─── API helpers ──────────────────────────────────────────────────────────

async function fetchItems(): Promise<ContentPiece[]> {
  const res = await fetch('/api/content')
  if (!res.ok) throw new Error('fetch failed')
  const data = await res.json() as { items: ContentPiece[] }
  return data.items
}

async function createItem(payload: Omit<ContentPiece, 'id' | 'createdAt'>): Promise<ContentPiece> {
  const res = await fetch('/api/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('create failed')
  const data = await res.json() as { item: ContentPiece }
  return data.item
}

async function updateItem(id: string, payload: Partial<ContentPiece>): Promise<ContentPiece> {
  const res = await fetch(`/api/content/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('update failed')
  const data = await res.json() as { item: ContentPiece }
  return data.item
}

async function deleteItem(id: string): Promise<void> {
  const res = await fetch(`/api/content/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('delete failed')
}

// ─── DropColumn ───────────────────────────────────────────────────────────

function DropColumn({ col, items, onAdd, onEdit }: {
  col: typeof COLUMNS[0]
  items: ContentPiece[]
  onAdd: (status: UnifiedStatus) => void
  onEdit: (item: ContentPiece) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{col.label}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            {items.length}
          </span>
        </div>
        <button onClick={() => onAdd(col.id)} className="p-1 rounded-lg hover:opacity-70 transition-transform duration-200 hover:rotate-90">
          <Plus size={14} style={{ color: 'var(--muted-foreground)' }} />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-2 rounded-xl p-2 min-h-[120px] transition-colors"
        style={{
          backgroundColor: isOver ? col.color + '0D' : 'var(--muted)',
          border: `1px dashed ${isOver ? col.color + '66' : 'transparent'}`,
        }}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <PipelineCard key={item.id} item={item} onClick={onEdit} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <button onClick={() => onAdd(col.id)}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 text-xs py-6 group transition-all duration-200"
            style={{ color: 'var(--muted-foreground)' }}>
            <Plus
              size={16}
              className="transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-0.5"
              style={{ color: col.color, opacity: 0.5 }}
            />
            <span className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100 opacity-60">
              + Añadir contenido
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── PipelineBoard ────────────────────────────────────────────────────────

export function PipelineBoard() {
  const [items, setItems] = useState<ContentPiece[]>([])
  const [loading, setLoading] = useState(true)
  const [activeItem, setActiveItem] = useState<ContentPiece | null>(null)
  const [modal, setModal] = useState<{ open: boolean; item?: ContentPiece | null; defaultStatus?: UnifiedStatus }>({ open: false })

  // Load items on mount
  useEffect(() => {
    fetchItems()
      .then(setItems)
      .catch(() => toast.error('Error al cargar el pipeline'))
      .finally(() => setLoading(false))
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = (e: DragStartEvent) => setActiveItem(items.find((i) => i.id === e.active.id) ?? null)

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return
    const item = items.find((i) => i.id === active.id)
    if (!item) return
    const overCol = COLUMNS.find((c) => c.id === over.id)
    if (overCol && item.status !== overCol.id) {
      // Optimistic update
      setItems((prev) => prev.map((i) => i.id === active.id ? { ...i, status: overCol.id } : i))
    }
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    setActiveItem(null)
    if (!over || active.id === over.id) return

    setItems((prev) => {
      const ai = prev.find((i) => i.id === active.id)
      const oi = prev.find((i) => i.id === over.id)
      const overCol = COLUMNS.find((c) => c.id === over.id)
      if (!ai) return prev

      if (overCol) {
        // Moved to a different column — persist status change
        updateItem(ai.id, { status: overCol.id }).catch(() => toast.error('Error al mover'))
        return prev.map((i) => i.id === active.id ? { ...i, status: overCol.id } : i)
      }

      if (oi && ai.status === oi.status) {
        const col = prev.filter((i) => i.status === ai.status)
        const reordered = arrayMove(
          col,
          col.findIndex((i) => i.id === active.id),
          col.findIndex((i) => i.id === over.id),
        ).map((i, idx) => ({ ...i, order: idx }))

        // Persist order for each reordered item (fire-and-forget)
        reordered.forEach((i) => updateItem(i.id, { order: i.order }).catch(() => {}))
        return [...prev.filter((i) => i.status !== ai.status), ...reordered]
      }

      return prev
    })
  }

  const handleSave = async (data: Omit<ContentPiece, 'id' | 'createdAt' | 'order'> & { id?: string }) => {
    if (data.id) {
      try {
        const updated = await updateItem(data.id, data)
        setItems((prev) => prev.map((i) => i.id === data.id ? updated : i))
        toast.success('Cambios guardados')
      } catch {
        toast.error('Error al guardar')
      }
    } else {
      const colItems = items.filter((i) => i.status === data.status)
      try {
        const created = await createItem({ ...data, order: colItems.length })
        setItems((prev) => [...prev, created])
        toast.success('Contenido añadido')
      } catch {
        toast.error('Error al crear')
      }
    }
  }

  const handleDelete = async (id: string) => {
    const deleted = items.find((i) => i.id === id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    try {
      await deleteItem(id)
      toast.success('Contenido eliminado', {
        action: {
          label: 'Deshacer',
          onClick: async () => {
            if (!deleted) return
            try {
              const restored = await createItem({
                title: deleted.title,
                description: deleted.description,
                type: deleted.type,
                status: deleted.status,
                color: deleted.color,
                category: deleted.category,
                date: deleted.date,
                endDate: deleted.endDate,
                format: deleted.format,
                platform: deleted.platform,
                emoji: deleted.emoji,
                order: deleted.order,
              })
              setItems((prev) => [...prev, restored])
            } catch {
              toast.error('No se pudo deshacer')
            }
          },
        },
      })
    } catch {
      // Restore on failure
      if (deleted) setItems((prev) => [...prev, deleted])
      toast.error('Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1.5">
            <div className="h-5 w-44 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-3.5 w-56 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
          <div className="h-9 w-36 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        </div>
        <div className="grid grid-cols-4 gap-4 flex-1">
          {COLUMNS.map((col, ci) => (
            <div key={col.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1 px-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color, opacity: 0.5 }} />
                <div className="h-3.5 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
                <div className="h-4 w-5 rounded-full animate-pulse ml-1" style={{ backgroundColor: 'var(--muted)' }} />
              </div>
              <div className="rounded-xl p-2 flex flex-col gap-2 min-h-[200px]" style={{ backgroundColor: 'var(--muted)' }}>
                {Array.from({ length: 3 - ci % 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-3 space-y-2 animate-pulse" style={{ backgroundColor: 'var(--card)', animationDelay: `${(ci * 3 + i) * 60}ms` }}>
                    <div className="h-3 w-16 rounded-full" style={{ backgroundColor: 'var(--muted)' }} />
                    <div className="h-3.5 w-full rounded" style={{ backgroundColor: 'var(--muted)' }} />
                    <div className="h-3 w-3/4 rounded" style={{ backgroundColor: 'var(--muted)' }} />
                    <div className="flex gap-2 mt-1">
                      <div className="h-4 w-10 rounded-full" style={{ backgroundColor: 'var(--muted)' }} />
                      <div className="h-4 w-16 rounded-full ml-auto" style={{ backgroundColor: 'var(--muted)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Pipeline de contenido</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Gestiona el ciclo de vida de cada pieza</p>
        </div>
        <button onClick={() => setModal({ open: true, item: null })}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
          <Plus size={15} /> Nuevo contenido
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex xl:grid xl:grid-cols-4 gap-4 flex-1 min-h-0 overflow-x-auto xl:overflow-x-visible snap-x snap-mandatory xl:snap-none -mx-6 px-6 xl:mx-0 xl:px-0">
          {COLUMNS.map((col) => (
            <div key={col.id} className="snap-start shrink-0 xl:shrink w-[280px] xl:w-auto flex flex-col min-h-0">
              <DropColumn col={col}
                items={items.filter((i) => i.status === col.id).sort((a, b) => a.order - b.order)}
                onAdd={(status) => setModal({ open: true, item: null, defaultStatus: status })}
                onEdit={(item) => setModal({ open: true, item })}
              />
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeItem && <div style={{ transform: 'rotate(2deg)', opacity: 0.95 }}><PipelineCard item={activeItem} onClick={() => {}} /></div>}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {modal.open && (
          <PipelineModal key="pipeline-modal" item={modal.item} defaultStatus={modal.defaultStatus}
            onSave={handleSave}
            onDelete={modal.item ? handleDelete : undefined}
            onClose={() => setModal({ open: false })} />
        )}
      </AnimatePresence>
    </div>
  )
}
