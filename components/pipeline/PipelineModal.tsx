'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { ContentPiece, UnifiedStatus, ContentCategory, ContentFormat, ContentPlatform } from '@/lib/types'
import { CATEGORY_LABELS, CATEGORY_COLORS, FORMAT_ICONS, PLATFORM_ICONS } from './CategoryChip'
import { DatePicker } from '@/components/calendario/DatePicker'

interface PipelineModalProps {
  item?: ContentPiece | null
  defaultStatus?: UnifiedStatus
  onSave: (item: Omit<ContentPiece, 'id' | 'createdAt' | 'order'> & { id?: string }) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const STATUSES: { id: UnifiedStatus; label: string }[] = [
  { id: 'drafts',     label: 'Drafts' },
  { id: 'en-proceso', label: 'En proceso' },
  { id: 'programado', label: 'Programado' },
  { id: 'publicado',  label: 'Publicado' },
]

const FORMATS: ContentFormat[] = ['reel', 'carrusel', 'historia', 'foto', 'video-largo', 'meme']
const PLATFORMS: ContentPlatform[] = ['instagram', 'tiktok', 'youtube', 'threads']

const REEL_CATEGORIES: ContentCategory[] = ['viral', 'nicho']
const HISTORIA_CATEGORIES: ContentCategory[] = ['lifestyle', 'dolor', 'deseo']

const FORMAT_LABELS: Record<ContentFormat, string> = {
  reel: 'Reel', carrusel: 'Carrusel', historia: 'Historia',
  foto: 'Foto', 'video-largo': 'Video largo', meme: 'Meme',
}
const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', threads: 'Threads',
}

const COLOR_OPTIONS = [
  { value: 'var(--accent)', name: 'Granate' },
  { value: '#B08A4A',       name: 'Ámbar'   },
  { value: '#5B8DEF',       name: 'Azul'    },
  { value: '#8B5CF6',       name: 'Púrpura' },
  { value: '#10B981',       name: 'Verde'   },
  { value: '#E05252',       name: 'Rojo'    },
  { value: '#6B7280',       name: 'Gris'    },
]

export function PipelineModal({ item, defaultStatus = 'drafts', onSave, onDelete, onClose }: PipelineModalProps) {
  const [type, setType]               = useState<'reel' | 'historia'>(item?.type ?? 'reel')
  const [title, setTitle]             = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [category, setCategory]       = useState<ContentCategory | undefined>(item?.category)
  const [format, setFormat]           = useState<ContentFormat>(item?.format ?? 'reel')
  const [platform, setPlatform]       = useState<ContentPlatform>(item?.platform ?? 'instagram')
  const [status, setStatus]           = useState<UnifiedStatus>(item?.status ?? defaultStatus)
  const [date, setDate]               = useState(item?.date ?? '')
  const [color, setColor]             = useState(item?.color ?? 'var(--accent)')

  // Portal mount: ensures createPortal only runs on client (SSR-safe).
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR portal mount gate
  useEffect(() => { setMounted(true) }, [])

  // Reset category when type changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset derived state on prop change
    if (!item) setCategory(undefined)
  }, [type, item])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const typeCategories = type === 'reel' ? REEL_CATEGORIES : HISTORIA_CATEGORIES

  const handleSubmit = () => {
    if (!title.trim()) return
    onSave({
      id: item?.id,
      title: title.trim(),
      description: description.trim(),
      type,
      status,
      color,
      category,
      format,
      platform,
      date: date || undefined,
    })
    onClose()
  }

  if (!mounted) return null

  // Portal to <body>: escapes parent stacking contexts so the overlay covers
  // TopBar + Sidebar reliably across all routes.
  return createPortal(
    <motion.div
      className="fixed inset-0 z-modal-overlay flex items-center justify-center p-4 glass-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className="w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
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
            {item ? 'Editar contenido' : 'Nueva pieza de contenido'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70">
            <X size={16} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Type toggle */}
          <div>
            <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'var(--muted-foreground)' }}>Tipo</label>
            <div className="flex gap-1.5">
              {(['reel', 'historia'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-all"
                  style={{
                    backgroundColor: type === t ? 'var(--accent)' : 'var(--muted)',
                    color: type === t ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                    border: type === t ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  {t === 'reel' ? '🎬 Reel' : '⏱️ Historia'}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del contenido..."
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:opacity-40"
            style={{ color: 'var(--foreground)' }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit() }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción, guión, notas..."
            rows={2}
            className="w-full bg-transparent text-sm outline-none resize-none placeholder:opacity-40"
            style={{ color: 'var(--muted-foreground)' }}
          />

          {/* Category */}
          <div>
            <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'var(--muted-foreground)' }}>Categoría</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategory(undefined)}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                style={{
                  backgroundColor: !category ? 'var(--muted)' : 'transparent',
                  color: !category ? 'var(--foreground)' : 'var(--muted-foreground)',
                  border: !category ? '1px solid var(--border)' : '1px solid transparent',
                }}
              >
                Sin categoría
              </button>
              {typeCategories.map((c) => {
                const active = category === c
                const col = CATEGORY_COLORS[c]
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(active ? undefined : c)}
                    className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                    style={{
                      backgroundColor: active ? col + '33' : 'var(--muted)',
                      color: active ? col : 'var(--muted-foreground)',
                      border: active ? `1px solid ${col}66` : '1px solid var(--border)',
                    }}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Format + Platform */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Formato</label>
              <div className="flex flex-wrap gap-1">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    title={FORMAT_LABELS[f]}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all"
                    style={{
                      backgroundColor: format === f ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'var(--muted)',
                      border: format === f ? '1px solid color-mix(in srgb, var(--accent) 40%, transparent)' : '1px solid var(--border)',
                    }}
                  >
                    {FORMAT_ICONS[f]}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--muted-foreground)' }}>{FORMAT_LABELS[format]}</p>
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Plataforma</label>
              <div className="flex flex-wrap gap-1">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    title={PLATFORM_LABELS[p]}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all"
                    style={{
                      backgroundColor: platform === p ? '#B08A4A33' : 'var(--muted)',
                      border: platform === p ? '1px solid #B08A4A66' : '1px solid var(--border)',
                    }}
                  >
                    {PLATFORM_ICONS[p]}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--muted-foreground)' }}>{PLATFORM_LABELS[platform]}</p>
            </div>
          </div>

          {/* Status + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UnifiedStatus)}
                className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>
                Fecha (aparece en Cal.)
              </label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="Sin fecha"
                triggerClassName="w-full text-xs rounded-lg px-3 py-2 text-left"
                triggerStyle={{
                  backgroundColor: 'var(--muted)',
                  color: date ? 'var(--foreground)' : 'var(--muted-foreground)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'var(--muted-foreground)' }}>Color (calendario)</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => setColor(c.value)}
                  className="w-5 h-5 rounded-full transition-all flex-shrink-0"
                  style={{
                    backgroundColor: c.value,
                    outline: color === c.value ? `2px solid ${c.value}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {item && onDelete ? (
            <button onClick={() => { onDelete(item.id); onClose() }}
              className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80"
              style={{ color: 'var(--destructive)', backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)' }}>
              Eliminar
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={!title.trim()}
              className="text-xs px-4 py-1.5 rounded-lg font-medium disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
              {item ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
