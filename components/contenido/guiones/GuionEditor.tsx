'use client'

import { useState } from 'react'
import { Trash2, FileText, Sparkles, Loader2, X } from 'lucide-react'
import type { GuionItem } from '@/lib/types'

interface GuionEditorProps {
  activeItem: GuionItem | null
  hasTabs: boolean
  label: string
  type?: string
  onUpdate: (patch: Partial<GuionItem>) => void
  onDelete: (id: string) => void
}

const TONE_OPTIONS = [
  { value: 'conversacional y directo', label: 'Conversacional' },
  { value: 'profesional y confiable', label: 'Profesional' },
  { value: 'inspiracional y motivador', label: 'Inspiracional' },
  { value: 'urgente y persuasivo', label: 'Urgente' },
]

export function GuionEditor({ activeItem, hasTabs, label, type, onUpdate, onDelete }: GuionEditorProps) {
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiTone, setAiTone] = useState(TONE_OPTIONS[0].value)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!activeItem || !aiTopic.trim()) return
    setIsGenerating(true)
    setAiError(null)
    try {
      const res = await fetch('/api/guiones/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic.trim(), type: (type === 'reel' || type === 'historia') ? type : 'reel', tone: aiTone }),
      })
      const data = (await res.json()) as { content?: string; error?: string }
      if (!res.ok || !data.content) {
        setAiError(data.error ?? 'Error al generar el guión')
        return
      }
      onUpdate({ content: data.content })
      setShowAIPanel(false)
      setAiTopic('')
    } catch {
      setAiError('Error de conexión. Intentá de nuevo.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!activeItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <FileText size={32} style={{ color: 'var(--muted-foreground)', opacity: 0.15 }} />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>
          {hasTabs ? 'Selecciona o crea un guión' : 'Crea una pestaña para empezar'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Title bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b gap-3" style={{ borderColor: 'var(--border)' }}>
        <input
          value={activeItem.title}
          onChange={e => onUpdate({ title: e.target.value })}
          placeholder="Título del guión"
          className="flex-1 text-sm font-semibold bg-transparent outline-none"
          style={{ color: 'var(--foreground)' }}
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => { setShowAIPanel(p => !p); setAiError(null) }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity"
            style={{
              background: showAIPanel ? 'var(--accent)' : 'var(--muted)',
              color: showAIPanel ? 'var(--accent-foreground)' : 'var(--foreground)',
            }}
            title="Generar con IA"
          >
            <Sparkles size={12} />
            <span>Generar con IA</span>
          </button>
          <button
            onClick={() => onDelete(activeItem.id)}
            className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--accent)' }}
            title="Eliminar guión"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* AI generation panel */}
      {showAIPanel && (
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
          <div className="flex items-start gap-3">
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                  Generá un guión con IA
                </p>
                <button
                  onClick={() => { setShowAIPanel(false); setAiError(null) }}
                  className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !isGenerating) void handleGenerate() }}
                  placeholder="Tema del guión, ej: 3 errores que comete todo emprendedor"
                  className="flex-1 text-xs px-3 py-2 rounded-lg outline-none border"
                  style={{
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)',
                  }}
                  disabled={isGenerating}
                />
                <select
                  value={aiTone}
                  onChange={e => setAiTone(e.target.value)}
                  className="text-xs px-2 py-2 rounded-lg border outline-none"
                  style={{
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)',
                  }}
                  disabled={isGenerating}
                >
                  {TONE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => void handleGenerate()}
                  disabled={isGenerating || !aiTopic.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
                >
                  {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {isGenerating ? 'Generando...' : 'Generar'}
                </button>
              </div>

              {aiError && (
                <p className="text-xs" style={{ color: 'var(--accent)' }}>
                  {aiError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 px-6 py-5">
        <textarea
          value={activeItem.content}
          onChange={e => onUpdate({ content: e.target.value })}
          placeholder={`Escribe el guión de tu ${label} aquí...\n\nEstructura sugerida:\n🎣 HOOK (0-3 seg)\n...\n📖 DESARROLLO\n...\n📣 CTA`}
          className="w-full resize-none text-sm leading-relaxed outline-none bg-transparent"
          style={{ color: 'var(--foreground)', minHeight: '420px', height: '100%' }}
          spellCheck={false}
        />
      </div>

      <div className="px-6 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[10px]" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
          Guardado automáticamente · {activeItem.content.split(/\s+/).filter(Boolean).length} palabras
        </p>
      </div>
    </div>
  )
}
