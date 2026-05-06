'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Lightbulb, ExternalLink, Trash2 } from 'lucide-react'
import type { ContentFormat } from '@/lib/types'
import { FORMAT_ICONS } from '@/components/pipeline/CategoryChip'
import { toast } from 'sonner'

const FORMAT_OPTIONS: { value: ContentFormat; label: string }[] = [
  { value: 'reel', label: 'Reel' },
  { value: 'carrusel', label: 'Carrusel' },
  { value: 'historia', label: 'Historia' },
  { value: 'foto', label: 'Foto' },
  { value: 'video-largo', label: 'Video largo' },
]

const FORMAT_LABELS: Record<ContentFormat, string> = {
  reel: 'Reel', carrusel: 'Carrusel', historia: 'Historia',
  foto: 'Foto', 'video-largo': 'Video largo', meme: 'Meme',
}

// ─── API response shape ───────────────────────────────────────────────────────

interface DbIdea {
  id: string
  title: string
  format: string
  notes: string
  referenceUrl: string
  createdAt: string
  updatedAt: string
}

function formatToContentFormat(f: string): ContentFormat {
  const valid: ContentFormat[] = ['reel', 'carrusel', 'historia', 'foto', 'video-largo', 'meme']
  return valid.includes(f as ContentFormat) ? (f as ContentFormat) : 'reel'
}

interface IdeaItem {
  id: string
  title: string
  format: ContentFormat
  notes?: string
  referenceUrl?: string
  createdAt: string
}

function dbToIdea(d: DbIdea): IdeaItem {
  return {
    id: d.id,
    title: d.title,
    format: formatToContentFormat(d.format),
    notes: d.notes || undefined,
    referenceUrl: d.referenceUrl || undefined,
    createdAt: d.createdAt,
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface IdeasDrawerProps {
  open: boolean
  onClose: () => void
  /** Called after any mutation so IdeasButton can refresh its count */
  onCountChange?: (count: number) => void
}

export function IdeasDrawer({ open, onClose, onCountChange }: IdeasDrawerProps) {
  const [ideas, setIdeas] = useState<IdeaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newFormat, setNewFormat] = useState<ContentFormat>('reel')
  const [newNotes, setNewNotes] = useState('')
  const [newUrl, setNewUrl] = useState('')

  // ─── Load on mount / re-open ───────────────────────────────────────────────

  const loadIdeas = useCallback(async () => {
    try {
      const res = await fetch('/api/ideas')
      if (!res.ok) return
      const data = await res.json() as { ideas: DbIdea[] }
      const loaded = data.ideas.map(dbToIdea)
      setIdeas(loaded)
      onCountChange?.(loaded.length)
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  useEffect(() => {
    if (open) loadIdeas()
  }, [open, loadIdeas])

  // ─── Keyboard handler ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        format: newFormat,
        notes: newNotes.trim() || undefined,
        referenceUrl: newUrl.trim() || undefined,
      }),
    })
    if (!res.ok) { toast.error('Error al guardar'); return }
    const data = await res.json() as { idea: DbIdea }
    const newIdea = dbToIdea(data.idea)
    setIdeas(prev => {
      const next = [newIdea, ...prev]
      onCountChange?.(next.length)
      return next
    })
    setNewTitle(''); setNewNotes(''); setNewUrl(''); setNewFormat('reel'); setAdding(false)
    toast.success('Idea guardada')
  }

  const handleDelete = async (id: string) => {
    const deleted = ideas.find(i => i.id === id)
    setIdeas(prev => {
      const next = prev.filter(i => i.id !== id)
      onCountChange?.(next.length)
      return next
    })

    if (deleted) {
      toast.success('Idea eliminada', {
        action: {
          label: 'Deshacer',
          onClick: async () => {
            // Re-create via API using the same data
            const res = await fetch('/api/ideas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: deleted.title,
                format: deleted.format,
                notes: deleted.notes,
                referenceUrl: deleted.referenceUrl,
              }),
            })
            if (res.ok) {
              const data = await res.json() as { idea: DbIdea }
              const restored = dbToIdea(data.idea)
              setIdeas(prev => {
                const next = [restored, ...prev]
                onCountChange?.(next.length)
                return next
              })
            }
          },
        },
      })
    }

    await fetch(`/api/ideas/${id}`, { method: 'DELETE' })
  }

  return (
    <>
      {/* Backdrop — always rendered, fade via opacity so it doesn't flash on unmount */}
      <div
        className="fixed inset-0 z-modal"
        style={{
          backgroundColor: 'rgba(0,0,0,0.4)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 250ms ease',
        }}
        onClick={onClose}
      />

      <div
        className="fixed top-0 right-0 h-full z-popover flex flex-col"
        style={{
          width: 320,
          backgroundColor: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 320ms var(--ease-smooth)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Lightbulb size={15} style={{ color: '#B08A4A' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Baúl de ideas</span>
            {ideas.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                {ideas.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70">
            <X size={15} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {loading && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>Cargando…</p>
            </div>
          )}

          {!loading && ideas.map((idea) => (
            <div
              key={idea.id}
              className="flex items-start gap-2.5 p-2.5 rounded-xl group transition-all"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{FORMAT_ICONS[idea.format]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>{idea.title}</p>
                <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{FORMAT_LABELS[idea.format]}</span>
                {idea.notes && <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'var(--muted-foreground)' }}>{idea.notes}</p>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {idea.referenceUrl && (
                  <a href={idea.referenceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <ExternalLink size={12} style={{ color: 'var(--muted-foreground)' }} />
                  </a>
                )}
                <button onClick={() => handleDelete(idea.id)}>
                  <Trash2 size={12} style={{ color: '#E05252' }} />
                </button>
              </div>
            </div>
          ))}

          {!loading && ideas.length === 0 && !adding && (
            <div className="text-center py-12">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 animate-float" style={{ color: 'var(--muted-foreground)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Sin ideas todavía</p>
              <p className="text-xs mt-1 opacity-60" style={{ color: 'var(--muted-foreground)' }}>Empieza a capturar tus ideas</p>
            </div>
          )}
        </div>

        <div className="border-t px-3 py-3" style={{ borderColor: 'var(--border)' }}>
          {adding ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título de la idea..."
                className="w-full text-sm bg-transparent outline-none placeholder:opacity-40 px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              />
              <div className="flex gap-1.5 flex-wrap">
                {FORMAT_OPTIONS.map((f) => (
                  <button key={f.value} onClick={() => setNewFormat(f.value)}
                    className="text-[10px] px-2 py-1 rounded-full font-medium transition-all"
                    style={{
                      backgroundColor: newFormat === f.value ? '#8E1F2F33' : 'var(--muted)',
                      color: newFormat === f.value ? 'var(--accent)' : 'var(--muted-foreground)',
                      border: newFormat === f.value ? '1px solid #8E1F2F66' : '1px solid var(--border)',
                    }}>
                    {FORMAT_ICONS[f.value]} {f.label}
                  </button>
                ))}
              </div>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notas (opcional)..."
                rows={2}
                className="w-full text-xs bg-transparent outline-none resize-none placeholder:opacity-40 px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="URL de referencia (opcional)..."
                className="w-full text-xs bg-transparent outline-none placeholder:opacity-40 px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              />
              <div className="flex gap-2">
                <button onClick={() => setAdding(false)}
                  className="flex-1 text-xs py-1.5 rounded-lg hover:opacity-70"
                  style={{ color: 'var(--muted-foreground)' }}>
                  Cancelar
                </button>
                <button onClick={handleAdd} disabled={!newTitle.trim()}
                  className="flex-1 text-xs py-1.5 rounded-lg font-medium disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  Guardar idea
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 w-full text-xs px-3 py-2.5 rounded-xl font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px dashed var(--border)' }}
            >
              <Plus size={13} /> Nueva idea
            </button>
          )}
        </div>
      </div>
    </>
  )
}
