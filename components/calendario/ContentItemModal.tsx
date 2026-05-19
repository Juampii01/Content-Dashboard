'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { X, Calendar, Tag, Layers, Palette, Maximize2, Minimize2, Columns2, Smile } from 'lucide-react'
import { ContentItem, UnifiedStatus, ContentCategory, ContentTemplate, ReelCategory, HistoriaCategory } from '@/lib/types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/components/pipeline/CategoryChip'
import { DatePicker } from './DatePicker'
import dynamic from 'next/dynamic'

const RichEditor = dynamic(() => import('./RichEditor').then((m) => m.RichEditor), { ssr: false })
const EmojiPickerLib = dynamic(() => import('emoji-picker-react'), { ssr: false })

const REEL_CATEGORIES: ReelCategory[]     = ['viral', 'nicho']
const HISTORIA_CATEGORIES: HistoriaCategory[] = ['lifestyle', 'dolor', 'deseo']

interface ContentItemModalProps {
  item?: ContentItem | null
  defaultDate?: string
  prefill?: ContentTemplate
  type: 'reel' | 'historia'
  onSave: (item: Omit<ContentItem, 'id' | 'createdAt' | 'order'> & { id?: string }) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const STATUS_OPTIONS: { value: UnifiedStatus; label: string; color: string }[] = [
  { value: 'drafts',     label: 'Drafts',     color: '#6B7280' },
  { value: 'en-proceso', label: 'En proceso', color: '#B08A4A' },
  { value: 'programado', label: 'Programado', color: '#5B8DEF' },
  { value: 'publicado',  label: 'Publicado',  color: '#10B981' },
]

const COLOR_OPTIONS: { value: string; name: string }[] = [
  { value: 'var(--accent)', name: 'Granate' },
  { value: '#B08A4A',       name: 'Ámbar'   },
  { value: '#5B8DEF',       name: 'Azul'    },
  { value: '#8B5CF6',       name: 'Púrpura' },
  { value: '#10B981',       name: 'Verde'   },
  { value: '#F59E0B',       name: 'Naranja' },
  { value: '#E05252',       name: 'Rojo'    },
  { value: '#6B7280',       name: 'Gris'    },
]


function PropertyRow({
  icon, label, children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-default min-h-[32px]">
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{ width: 140, color: 'var(--muted-foreground)' }}
      >
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export function ContentItemModal({ item, defaultDate, prefill, type, onSave, onDelete, onClose }: ContentItemModalProps) {
  const [title, setTitle]             = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? prefill?.description ?? '')
  const [date, setDate]               = useState(item?.date ?? defaultDate ?? '')
  const [endDate, setEndDate]         = useState(item?.endDate ?? '')
  const [status, setStatus]           = useState<UnifiedStatus>(item?.status ?? prefill?.status ?? 'drafts')
  const [color, setColor]             = useState(item?.color ?? prefill?.color ?? 'var(--accent)')
  const [category, setCategory]       = useState<ContentCategory | undefined>(item?.category ?? prefill?.category)
  const [emoji, setEmoji]             = useState(item?.emoji ?? '')
  const [isExpanded, setIsExpanded]   = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [emojiPickerPos, setEmojiPickerPos] = useState<{ top: number; left: number } | null>(null)
  const [headerHovered, setHeaderHovered] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  const openEmojiPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setEmojiPickerPos({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 336) })
    setEmojiPickerOpen(v => !v)
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (emojiPickerOpen) { setEmojiPickerOpen(false) } else { onClose() } } }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, emojiPickerOpen])

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiPickerOpen) return
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [emojiPickerOpen])

  const handleSave = () => {
    if (!title.trim() || !date) return
    const normalizedEnd = endDate && endDate !== date ? endDate : undefined
    onSave({
      id: item?.id,
      title: title.trim(),
      description: description.trim(),
      date, endDate: normalizedEnd,
      status, color, type, category, emoji: emoji || undefined,
    })
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        layout
        className={`w-full rounded-2xl shadow-2xl flex flex-col ${isExpanded ? 'max-w-5xl' : 'max-w-3xl'}`}
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderTop: `3px solid ${STATUS_OPTIONS.find(s => s.value === status)?.color ?? 'var(--border)'}`,
          maxHeight: '92vh',
          minHeight: '82vh',
        }}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 6  }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}
      >
        {/* Notion-style toolbar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-0 flex-shrink-0">
          {/* Left — expand + layout + nav */}
          <div className="flex items-center gap-0.5">
            {/* Expand / Collapse */}
            <button
              onClick={() => setIsExpanded(v => !v)}
              className="p-1.5 rounded-md transition-opacity hover:opacity-80"
              title={isExpanded ? 'Reducir' : 'Expandir'}
            >
              {isExpanded
                ? <Minimize2 size={14} style={{ color: 'var(--muted-foreground)' }} />
                : <Maximize2 size={14} style={{ color: 'var(--muted-foreground)' }} />}
            </button>

            {/* Layout toggle (visual, no-op for now) */}
            <button
              className="p-1.5 rounded-md transition-opacity hover:opacity-80"
              title="Vista centrada"
            >
              <Columns2 size={14} style={{ color: 'var(--muted-foreground)' }} />
            </button>

          </div>

          {/* Right — close */}
          <button onClick={onClose} className="p-1.5 rounded-md hover:opacity-60 transition-opacity">
            <X size={14} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-10 pb-4 pt-2">

          {/* Notion-style emoji icon + hover actions */}
          <div
            className="mb-1 min-h-[52px]"
            onMouseEnter={() => setHeaderHovered(true)}
            onMouseLeave={() => setHeaderHovered(false)}
          >
            {emoji ? (
              <div className="relative inline-block">
                <button
                  onClick={openEmojiPicker}
                  className="text-[52px] leading-none hover:opacity-80 transition-opacity rounded-xl p-1"
                  style={{ lineHeight: 1 }}
                  title="Cambiar icono"
                >
                  {emoji}
                </button>
                {/* Remove emoji button */}
                {headerHovered && (
                  <button
                    onClick={() => setEmoji('')}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--muted-foreground)', color: 'var(--card)' }}
                    title="Eliminar icono"
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <div className={`transition-opacity duration-150 ${headerHovered ? 'opacity-100' : 'opacity-0'}`}>
                <button
                  onClick={openEmojiPicker}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--muted-foreground)', backgroundColor: 'var(--muted)' }}
                >
                  <Smile size={13} />
                  Añadir icono
                </button>
              </div>
            )}

            {/* Emoji picker — fixed so it escapes modal overflow clipping */}
            {emojiPickerOpen && emojiPickerPos && (
              <div
                ref={emojiPickerRef}
                className="fixed z-[200]"
                style={{ top: emojiPickerPos.top, left: emojiPickerPos.left }}
                onMouseDown={e => e.stopPropagation()}
              >
                <EmojiPickerLib
                  onEmojiClick={e => { setEmoji(e.emoji); setEmojiPickerOpen(false) }}
                  searchPlaceholder="Buscar..."
                  width={320}
                  height={380}
                  emojiStyle={'native' as never}
                  lazyLoadEmojis={false}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>

          {/* Title */}
          <div className="mb-5">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              placeholder={type === 'reel' ? '¿Qué vas a publicar?' : '¿Qué vas a contar?'}
              className="w-full bg-transparent font-bold outline-none placeholder:opacity-20"
              style={{ color: 'var(--foreground)', fontSize: 36, lineHeight: 1.2 }}
            />
          </div>

          {/* Properties — Notion-style */}
          <div className="space-y-0 -mx-3">

            {/* Fecha */}
            <PropertyRow icon={<Calendar size={14} />} label="Fecha">
              <div className="flex items-center gap-1.5 flex-wrap">
                <DatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="Vacío"
                  triggerStyle={{ color: date ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                />
                {date && (
                  <>
                    <span className="text-sm select-none" style={{ color: 'var(--muted-foreground)' }}>→</span>
                    <DatePicker
                      value={endDate}
                      onChange={setEndDate}
                      min={date}
                      placeholder="Añadir fecha fin"
                      triggerStyle={{
                        color: endDate ? 'var(--foreground)' : 'var(--muted-foreground)',
                        fontStyle: endDate ? 'normal' : 'italic',
                      }}
                    />
                  </>
                )}
              </div>
            </PropertyRow>

            {/* Estado */}
            <PropertyRow icon={<Layers size={14} />} label="Estado">
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-all${status !== s.value ? ' hover:bg-muted' : ''}`}
                    style={{
                      backgroundColor: status === s.value ? s.color + '22' : 'transparent',
                      color: status === s.value ? s.color : 'var(--muted-foreground)',
                      border: status === s.value ? `1px solid ${s.color}55` : '1px solid transparent',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </PropertyRow>

            {/* Categoría */}
            <PropertyRow icon={<Tag size={14} />} label="Categoría">
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setCategory(undefined)}
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-all${category !== undefined ? ' hover:bg-muted' : ''}`}
                  style={{
                    backgroundColor: !category ? 'color-mix(in srgb, var(--accent) 13%, transparent)' : 'transparent',
                    color: !category ? 'var(--accent)' : 'var(--muted-foreground)',
                    border: !category ? '1px solid color-mix(in srgb, var(--accent) 33%, transparent)' : '1px solid transparent',
                  }}
                >
                  Sin categoría
                </button>
                {(type === 'reel' ? REEL_CATEGORIES : HISTORIA_CATEGORIES).map((c) => {
                  const col = CATEGORY_COLORS[c]
                  const active = category === c
                  return (
                    <button
                      key={c}
                      onClick={() => setCategory(active ? undefined : c)}
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-all${!active ? ' hover:bg-muted' : ''}`}
                      style={{
                        backgroundColor: active ? col + '22' : 'transparent',
                        color: active ? col : 'var(--muted-foreground)',
                        border: active ? `1px solid ${col}55` : '1px solid transparent',
                      }}
                    >
                      {CATEGORY_LABELS[c]}
                    </button>
                  )
                })}
              </div>
            </PropertyRow>

            {/* Color */}
            <PropertyRow icon={<Palette size={14} />} label="Color">
              <div className="flex gap-1.5 items-center">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setColor(c.value)}
                    className="w-4 h-4 rounded-full transition-all flex-shrink-0 cursor-pointer"
                    style={{
                      backgroundColor: c.value,
                      outline: color === c.value ? `2px solid ${c.value}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </PropertyRow>
          </div>

          {/* Divider */}
          <div className="my-8" style={{ height: '1px', backgroundColor: 'var(--border)' }} />

          {/* Description */}
          <RichEditor
            value={description}
            onChange={setDescription}
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-14 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {item && onDelete ? (
            <button
              onClick={() => { onDelete(item.id); onClose() }}
              className="text-sm px-3 py-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{ color: '#E05252', backgroundColor: '#E0525215' }}
            >
              Eliminar
            </button>
          ) : <span />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm px-3.5 py-2 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || !date}
              className="text-sm px-5 py-2 rounded-lg font-semibold transition-opacity disabled:opacity-30"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {item ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
