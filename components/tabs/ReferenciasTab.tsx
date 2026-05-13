'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, Trash2, X, Link as LinkIcon, RefreshCw } from 'lucide-react'
import { VALID_CATEGORIES, VALID_PLATFORMS } from '@/lib/schemas/references'

interface ContentReference {
  id: string
  title: string
  category: string
  tags: string[]
  url: string | null
  platform: string
  notes: string | null
  createdAt: string
}

const CAT_COLORS: Record<string, string> = {
  Hook:           'var(--accent)',
  Estructura:     '#B08A4A',
  CTA:            '#A63A4B',
  Storytelling:   '#6E2A35',
  'Social Proof': '#8A7A4A',
  Otro:           'var(--secondary)',
}

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      className="animate-pulse rounded h-44"
      style={{ backgroundColor: 'var(--muted)', animationDelay: `${delay}ms` }}
    />
  )
}

// ─── Add reference modal ───────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void
  onSaved: (ref: ContentReference) => void
}

function AddModal({ onClose, onSaved }: AddModalProps) {
  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState<string>(VALID_CATEGORIES[0])
  const [platform, setPlatform] = useState<string>(VALID_PLATFORMS[0])
  const [url, setUrl]           = useState('')
  const [notes, setNotes]       = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags]         = useState<string[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const submit = async () => {
    if (!title.trim()) { setError('El título es obligatorio'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/instagram/references', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: title.trim(), category, platform, tags, url: url.trim() || undefined, notes: notes.trim() || undefined }),
      })
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? 'Error al guardar') }
      const { reference } = await res.json() as { reference: ContentReference }
      onSaved(reference)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Nueva referencia</h3>
          <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }}><X size={16} /></button>
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--destructive)20', color: 'var(--destructive)' }}>{error}</p>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Título *</label>
            <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Hook magnético de apertura…"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Categoría</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                {VALID_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Plataforma</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                {VALID_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>URL (opcional)</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/…"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Tags</label>
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="viralidad (Enter para agregar)"
                className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
                style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
              <button onClick={addTag} className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>+</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                    #{t}
                    <button onClick={() => setTags(tags.filter((x) => x !== t))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Notas (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Por qué esta referencia es relevante…"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
              style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg"
            style={{ color: 'var(--muted-foreground)' }}>Cancelar</button>
          <button onClick={() => void submit()} disabled={saving}
            className="text-sm font-semibold px-5 py-2 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', opacity: saving ? 0.7 : 1 }}>
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ReferenciasTab() {
  const [refs, setRefs]           = useState<ContentReference[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/instagram/references')
      .then((r) => r.json() as Promise<{ references: ContentReference[] }>)
      .then(({ references }) => { if (!cancelled) setRefs(references) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta referencia?')) return
    setDeleting(id)
    try {
      await fetch('/api/instagram/references', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      })
      setRefs((prev) => prev.filter((r) => r.id !== id))
    } catch {}
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Biblioteca de referencias de contenido que inspiran tu estrategia.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          <Plus size={12} /> Nueva referencia
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} delay={i * 80} />)}
        </div>
      ) : refs.length === 0 ? (
        <div className="rounded-xl p-12 text-center"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderStyle: 'dashed' }}>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Sin referencias guardadas</p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Guardá hooks, estructuras y CTAs que te inspiren para crear contenido.
          </p>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 mx-auto text-xs font-semibold px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
            <Plus size={12} /> Agregar primera referencia
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {refs.map((ref) => {
            const catColor = CAT_COLORS[ref.category] ?? 'var(--secondary)'
            return (
              <div key={ref.id} className="rounded-xl overflow-hidden group"
                style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="h-24 flex items-center justify-center relative"
                  style={{ backgroundColor: 'var(--muted)' }}>
                  {ref.url ? (
                    <a href={ref.url} target="_blank" rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'white' }}>
                      <LinkIcon size={14} /> Ver enlace
                    </a>
                  ) : null}
                  <span className="text-4xl">🎥</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40` }}>
                      {ref.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--muted-foreground)' }}>{ref.platform}</span>
                      <button
                        onClick={() => void handleDelete(ref.id)}
                        disabled={deleting === ref.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--destructive)' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-2 leading-snug" style={{ color: 'var(--foreground)' }}>{ref.title}</p>
                  {ref.notes && (
                    <p className="text-[11px] mb-2 leading-relaxed line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>{ref.notes}</p>
                  )}
                  {ref.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ref.tags.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <AddModal
          onClose={() => setShowModal(false)}
          onSaved={(ref) => { setRefs((prev) => [ref, ...prev]); setShowModal(false) }}
        />
      )}
    </div>
  )
}
