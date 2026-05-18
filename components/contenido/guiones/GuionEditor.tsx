'use client'

import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Trash2, FileText, Sparkles, Loader2, X,
  Bold, Italic, List, ListOrdered, Heading2,
} from 'lucide-react'
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

/** Convert legacy plain-text content to TipTap-compatible HTML. */
function toHTML(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trimStart()
  // Already HTML — pass through
  if (trimmed.startsWith('<')) return raw
  // Plain text → wrap paragraphs in <p>, newlines in <br>
  return raw
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function GuionEditor({ activeItem, hasTabs, label, type, onUpdate, onDelete }: GuionEditorProps) {
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiTone, setAiTone] = useState(TONE_OPTIONS[0].value)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Keep a ref to the latest onUpdate so the editor's onUpdate closure stays fresh
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // True while we're programmatically setting content — suppress the save debounce
  const isLoadingContentRef = useRef(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `Escribe el guión de tu ${label} aquí…\n\nEstructura sugerida:\n🎣 HOOK (0-3 seg)\n📖 DESARROLLO\n📣 CTA`,
      }),
    ],
    content: '',
    onUpdate: ({ editor: e }) => {
      if (isLoadingContentRef.current) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        onUpdateRef.current({ content: e.getHTML() })
      }, 400)
    },
    editorProps: {
      attributes: {
        class: 'prose-editor tiptap-guion outline-none',
      },
    },
  })

  // Sync content when active item changes
  const lastItemId = useRef<string | null>(null)
  useEffect(() => {
    if (!editor || !activeItem) return
    if (lastItemId.current === activeItem.id) return
    lastItemId.current = activeItem.id
    // Prevent the setContent from triggering a save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    isLoadingContentRef.current = true
    editor.commands.setContent(toHTML(activeItem.content))
    // Use a microtask to re-enable saves after the update event fires
    Promise.resolve().then(() => { isLoadingContentRef.current = false })
  }, [editor, activeItem])

  async function handleGenerate() {
    if (!activeItem || !aiTopic.trim()) return
    setIsGenerating(true)
    setAiError(null)
    try {
      const res = await fetch('/api/guiones/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          type: (type === 'reel' || type === 'historia') ? type : 'reel',
          tone: aiTone,
        }),
      })
      const data = (await res.json()) as { content?: string; error?: string }
      if (!res.ok || !data.content) {
        setAiError(data.error ?? 'Error al generar el guión')
        return
      }
      // AI returns plain text — convert to HTML and insert
      const html = toHTML(data.content)
      if (editor) {
        isLoadingContentRef.current = true
        editor.commands.setContent(html)
        Promise.resolve().then(() => { isLoadingContentRef.current = false })
      }
      onUpdate({ content: html })
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

  const wordCount = editor?.getText().split(/\s+/).filter(Boolean).length ?? 0

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Title bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b gap-3 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <input
          value={activeItem.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título del guión"
          className="flex-1 text-sm font-semibold bg-transparent outline-none"
          style={{ color: 'var(--foreground)' }}
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => { setShowAIPanel((p) => !p); setAiError(null) }}
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
        <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
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
                  onChange={(e) => setAiTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isGenerating) void handleGenerate() }}
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
                  onChange={(e) => setAiTone(e.target.value)}
                  className="text-xs px-2 py-2 rounded-lg border outline-none"
                  style={{
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)',
                  }}
                  disabled={isGenerating}
                >
                  {TONE_OPTIONS.map((opt) => (
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

      {/* Formatting toolbar */}
      {editor && (
        <div
          className="flex items-center gap-0.5 px-4 py-1.5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          {[
            {
              icon: <Bold size={13} />,
              title: 'Negrita',
              active: editor.isActive('bold'),
              action: () => editor.chain().focus().toggleBold().run(),
            },
            {
              icon: <Italic size={13} />,
              title: 'Cursiva',
              active: editor.isActive('italic'),
              action: () => editor.chain().focus().toggleItalic().run(),
            },
            {
              icon: <Heading2 size={13} />,
              title: 'Título',
              active: editor.isActive('heading', { level: 2 }),
              action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            },
            {
              icon: <List size={13} />,
              title: 'Lista',
              active: editor.isActive('bulletList'),
              action: () => editor.chain().focus().toggleBulletList().run(),
            },
            {
              icon: <ListOrdered size={13} />,
              title: 'Lista numerada',
              active: editor.isActive('orderedList'),
              action: () => editor.chain().focus().toggleOrderedList().run(),
            },
          ].map((btn, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); btn.action() }}
              title={btn.title}
              className="p-1.5 rounded transition-colors"
              style={{
                color: btn.active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                background: btn.active ? 'var(--accent)' : 'transparent',
              }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      )}

      {/* TipTap editor area */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5 cursor-text"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>

      <div className="px-6 py-2 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[10px]" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
          Guardado automáticamente · {wordCount} palabras
        </p>
      </div>

      <style>{`
        .tiptap-guion {
          min-height: 420px;
          font-size: 0.875rem;
          line-height: 1.75;
          color: var(--foreground);
        }
        .tiptap-guion p { margin: 0 0 0.75em; }
        .tiptap-guion p:last-child { margin-bottom: 0; }
        .tiptap-guion h2 {
          font-size: 1rem;
          font-weight: 700;
          margin: 1.25em 0 0.4em;
          color: var(--foreground);
        }
        .tiptap-guion ul, .tiptap-guion ol {
          padding-left: 1.5em;
          margin: 0.5em 0 0.75em;
        }
        .tiptap-guion li { margin: 0.2em 0; }
        .tiptap-guion strong { font-weight: 700; }
        .tiptap-guion em { font-style: italic; }
        .tiptap-guion .tiptap-placeholder::before {
          content: attr(data-placeholder);
          color: var(--muted-foreground);
          opacity: 0.4;
          float: left;
          pointer-events: none;
          height: 0;
          white-space: pre-line;
        }
      `}</style>
    </div>
  )
}
