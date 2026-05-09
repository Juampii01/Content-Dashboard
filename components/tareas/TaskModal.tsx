'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { X, Tag } from 'lucide-react'
import { Task, TaskColumnId, TaskLabel } from '@/lib/types'
import { LabelBadge, LABEL_PRESETS } from './LabelBadge'
import { DatePicker } from '@/components/calendario/DatePicker'

interface TaskModalProps {
  task?: Task | null
  defaultColumnId?: TaskColumnId
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'order'> & { id?: string }) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const COLUMNS: { id: TaskColumnId; label: string }[] = [
  { id: 'por-hacer', label: 'Por hacer' },
  { id: 'en-proceso', label: 'En proceso' },
  { id: 'listo', label: 'Listo' },
]

export function TaskModal({ task, defaultColumnId = 'por-hacer', onSave, onDelete, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [columnId, setColumnId] = useState<TaskColumnId>(task?.columnId ?? defaultColumnId)
  const [selectedLabel, setSelectedLabel] = useState<TaskLabel | undefined>(task?.label)

  // Portal mount: ensures createPortal only runs on client (SSR-safe).
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR portal mount gate
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = () => {
    if (!title.trim()) return
    onSave({
      id: task?.id,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      label: selectedLabel,
      columnId,
    })
    onClose()
  }

  if (!mounted) return null

  // Portal to <body>: escapes parent stacking contexts (PageTransition opacity,
  // motion wrappers, etc.) so the overlay reliably covers TopBar + Sidebar.
  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={task ? 'Editar tarea' : 'Nueva tarea'}
      className="fixed inset-0 z-modal-overlay flex items-center justify-center p-4 glass-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className="w-full max-w-md rounded-xl shadow-2xl flex flex-col"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 6  }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 30,
          mass: 0.85,
          opacity: { duration: 0.16, ease: 'easeOut' },
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {task ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70 transition-opacity">
            <X size={16} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la tarea..."
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:opacity-40"
              style={{ color: 'var(--foreground)' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit() }}
            />
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)..."
            rows={3}
            className="w-full bg-transparent text-sm outline-none resize-none placeholder:opacity-40"
            style={{ color: 'var(--muted-foreground)' }}
          />

          {/* Column + Due Date */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Columna</label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value as TaskColumnId)}
                className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>
                Fecha límite
              </label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Sin fecha"
                triggerClassName="w-full text-xs rounded-lg px-3 py-2 text-left"
                triggerStyle={{
                  backgroundColor: 'var(--muted)',
                  color: dueDate ? 'var(--foreground)' : 'var(--muted-foreground)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="text-[11px] font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
              <Tag size={11} /> Etiqueta
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_PRESETS.map((preset) => {
                const active = selectedLabel?.text === preset.text
                return (
                  <button
                    key={preset.text}
                    onClick={() => setSelectedLabel(active ? undefined : preset)}
                    className="transition-all"
                    style={{ outline: active ? `2px solid ${preset.color}` : 'none', outlineOffset: '2px', borderRadius: '999px' }}
                  >
                    <LabelBadge label={preset} small />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {task && onDelete ? (
            <button
              type="button"
              onClick={() => { onDelete(task.id); onClose() }}
              className="btn btn-sm"
              style={{
                color: 'var(--destructive)',
                backgroundColor: 'color-mix(in srgb, var(--destructive) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--destructive) 25%, var(--border))',
              }}
            >
              Eliminar
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="btn btn-primary btn-sm"
            >
              {task ? 'Guardar' : 'Crear tarea'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
