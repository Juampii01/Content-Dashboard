'use client'

import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Trash2, FileText, Sparkles, Loader2, X,
  Bold, Italic, List, ListOrdered, Heading2,
  Copy, Check, LayoutTemplate, Strikethrough,
  Minus, Clock,
} from 'lucide-react'
import type { GuionItem } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  { value: 'conversacional y directo',   label: 'Conversacional' },
  { value: 'profesional y confiable',    label: 'Profesional' },
  { value: 'inspiracional y motivador',  label: 'Inspiracional' },
  { value: 'urgente y persuasivo',       label: 'Urgente' },
]

/** Approximate speaking speed by format */
const WPM: Record<string, number> = { reel: 150, historia: 175 }

/** Target duration in seconds by format */
const TARGET_SEC: Record<string, number> = { reel: 60, historia: 30 }

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, string> = {
  reel: `<h2>🎣 HOOK (0-3 seg)</h2>
<p>Una pregunta disruptiva, afirmación sorprendente o promesa de valor clara.</p>
<h2>📖 DESARROLLO</h2>
<p>3-5 puntos concretos con ritmo. Lo que el espectador va a aprender, ver o sentir.</p>
<h2>📣 CTA</h2>
<p>Llamada a la acción específica y natural. Ej: "Guardá esto para cuando lo necesites".</p>`,

  historia: `<h2>🎣 APERTURA (0-3 seg)</h2>
<p>Frase de apertura breve e impactante que engancha desde el primer instante.</p>
<h2>📖 MENSAJE CENTRAL</h2>
<p>Mensaje único y directo. Visual, emocional o informativo — uno solo.</p>
<h2>📣 CTA</h2>
<p>Acción específica: responder, guardar, ir al perfil, mandar DM…</p>`,
}

function getTemplate(type?: string) {
  return TEMPLATES[type ?? ''] ?? TEMPLATES.reel
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert legacy plain-text content to TipTap-compatible HTML. */
function toHTML(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trimStart()
  if (trimmed.startsWith('<')) return raw
  return raw
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function estimateDuration(words: number, type?: string): string {
  if (words === 0) return ''
  const wpm = WPM[type ?? ''] ?? WPM.reel
  const seconds = Math.round((words / wpm) * 60)
  if (seconds < 60) return `~${seconds} seg`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `~${m}:${s.toString().padStart(2, '0')} min`
}

function targetLabel(type?: string): string {
  const sec = TARGET_SEC[type ?? ''] ?? TARGET_SEC.reel
  const wpm = WPM[type ?? ''] ?? WPM.reel
  const targetWords = Math.round((sec / 60) * wpm)
  return `Objetivo: ~${sec} seg (≈${targetWords} palabras)`
}

type SaveState = 'idle' | 'saving' | 'saved'

// ─── Props ────────────────────────────────────────────────────────────────────

interface GuionEditorProps {
  activeItem: GuionItem | null
  hasTabs: boolean
  label: string
  type?: string
  onUpdate: (patch: Partial<GuionItem>) => void
  onDelete: (id: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GuionEditor({ activeItem, hasTabs, label, type, onUpdate, onDelete }: GuionEditorProps) {
  // ── AI panel state
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiTopic, setAiTopic]         = useState('')
  const [aiTone, setAiTone]           = useState(TONE_OPTIONS[0].value)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError]         = useState<string | null>(null)

  // ── Save state
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Copy state
  const [copied, setCopied] = useState(false)

  // ── Local title (debounced — avoids PATCH on every keystroke)
  const [localTitle, setLocalTitle] = useState(activeItem?.title ?? '')
  const prevItemIdRef     = useRef<string | null>(null)
  const titleTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Refs
  const onUpdateRef       = useRef(onUpdate)
  const saveTimeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingRef      = useRef(false)

  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  // ─── TipTap editor ──────────────────────────────────────────────────────────

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `Escribe el guión de tu ${label} aquí…`,
      }),
    ],
    content: '',
    onUpdate: ({ editor: e }) => {
      if (isLoadingRef.current) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      setSaveState('saving')
      saveTimeoutRef.current = setTimeout(() => {
        onUpdateRef.current({ content: e.getHTML() })
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveState('saved'), 700)
      }, 400)
    },
    editorProps: {
      attributes: { class: 'prose-editor tiptap-guion outline-none' },
    },
  })

  // ─── Sync content when active item changes ──────────────────────────────────
  useEffect(() => {
    if (!editor || !activeItem) return
    if (prevItemIdRef.current === activeItem.id) return
    prevItemIdRef.current = activeItem.id

    // Sync title
    setLocalTitle(activeItem.title)
    setSaveState('idle')

    // Sync content
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    isLoadingRef.current = true
    editor.commands.setContent(toHTML(activeItem.content))
    Promise.resolve().then(() => { isLoadingRef.current = false })
  }, [editor, activeItem])

  // ─── Debounced title save ───────────────────────────────────────────────────
  function handleTitleChange(val: string) {
    setLocalTitle(val)
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
    setSaveState('saving')
    titleTimeoutRef.current = setTimeout(() => {
      onUpdateRef.current({ title: val })
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveState('saved'), 700)
    }, 500)
  }

  // ─── AI generation ──────────────────────────────────────────────────────────
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
      const html = toHTML(data.content)
      if (editor) {
        isLoadingRef.current = true
        editor.commands.setContent(html)
        Promise.resolve().then(() => { isLoadingRef.current = false })
      }
      onUpdate({ content: html })
      setSaveState('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveState('idle'), 3000)
      setShowAIPanel(false)
      setAiTopic('')
    } catch {
      setAiError('Error de conexión. Intentá de nuevo.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ─── Template insertion ─────────────────────────────────────────────────────
  function insertTemplate() {
    if (!editor) return
    const html = getTemplate(type)
    isLoadingRef.current = true
    editor.commands.setContent(html)
    Promise.resolve().then(() => { isLoadingRef.current = false })
    onUpdate({ content: html })
    setSaveState('saved')
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaveState('idle'), 3000)
  }

  // ─── Copy to clipboard ──────────────────────────────────────────────────────
  function handleCopy() {
    if (!activeItem || !editor) return
    const text = `${localTitle}\n\n${editor.getText()}`
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ─── Empty / no-item states ─────────────────────────────────────────────────
  if (!activeItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <FileText size={22} style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {hasTabs ? 'Seleccioná o creá un guión' : 'Creá una pestaña para empezar'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
            {hasTabs
              ? 'Hacé clic en un guión del panel izquierdo'
              : 'Usá el botón + en el panel izquierdo'}
          </p>
        </div>
      </div>
    )
  }

  // ─── Computed ───────────────────────────────────────────────────────────────
  const wordCount = editor?.getText().split(/\s+/).filter(Boolean).length ?? 0
  const duration  = estimateDuration(wordCount, type)
  const isEmpty   = wordCount === 0

  const toolbarButtons = editor ? [
    {
      icon: <Bold size={13} />, title: 'Negrita (⌘B)',
      active: editor.isActive('bold'),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: <Italic size={13} />, title: 'Cursiva (⌘I)',
      active: editor.isActive('italic'),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      icon: <Strikethrough size={13} />, title: 'Tachado',
      active: editor.isActive('strike'),
      action: () => editor.chain().focus().toggleStrike().run(),
    },
    null, // separator
    {
      icon: <Heading2 size={13} />, title: 'Sección (H2)',
      active: editor.isActive('heading', { level: 2 }),
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    null, // separator
    {
      icon: <List size={13} />, title: 'Lista',
      active: editor.isActive('bulletList'),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: <ListOrdered size={13} />, title: 'Lista numerada',
      active: editor.isActive('orderedList'),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    null, // separator
    {
      icon: <Minus size={13} />, title: 'Separador',
      active: false,
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ] : []

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">

      {/* ── Title bar ── */}
      <div
        className="flex items-center gap-2 px-5 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <input
          value={localTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Título del guión"
          className="flex-1 text-sm font-semibold bg-transparent outline-none min-w-0"
          style={{ color: 'var(--foreground)' }}
        />

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Copy */}
          <button
            onClick={handleCopy}
            title="Copiar guión completo"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 cursor-pointer"
            style={{
              background: copied ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--muted)',
              color: copied ? 'var(--accent)' : 'var(--muted-foreground)',
              border: copied ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' : '1px solid transparent',
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          {/* AI */}
          <button
            onClick={() => { setShowAIPanel((p) => !p); setAiError(null) }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 cursor-pointer"
            title="Generar con IA"
            style={{
              background: showAIPanel ? 'var(--accent)' : 'var(--muted)',
              color: showAIPanel ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
            }}
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">Generar con IA</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(activeItem.id)}
            className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: 'var(--accent)' }}
            title="Eliminar guión"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── AI generation panel ── */}
      {showAIPanel && (
        <div
          className="px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                Generá un guión con IA
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {targetLabel(type)}
              </p>
            </div>
            <button
              onClick={() => { setShowAIPanel(false); setAiError(null) }}
              className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isGenerating) void handleGenerate() }}
              placeholder={`Tema del ${label}, ej: 3 errores que comete todo emprendedor`}
              className="flex-1 text-xs px-3 py-2 rounded-lg outline-none border"
              style={{
                background: 'var(--background)',
                color: 'var(--foreground)',
                borderColor: 'var(--border)',
              }}
              disabled={isGenerating}
              autoFocus
            />
            <div className="flex gap-2">
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                className="text-xs px-2 py-2 rounded-lg border outline-none cursor-pointer"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                {isGenerating
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Sparkles size={12} />}
                {isGenerating ? 'Generando…' : 'Generar'}
              </button>
            </div>
          </div>

          {aiError && (
            <p className="mt-2 text-xs" style={{ color: 'var(--destructive)' }}>
              {aiError}
            </p>
          )}
        </div>
      )}

      {/* ── Formatting toolbar ── */}
      {editor && (
        <div
          className="flex items-center gap-0.5 px-3 py-1.5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          {toolbarButtons.map((btn, i) =>
            btn === null ? (
              <div
                key={`sep-${i}`}
                className="w-px h-4 mx-1 flex-shrink-0"
                style={{ backgroundColor: 'var(--border)' }}
              />
            ) : (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); btn.action() }}
                title={btn.title}
                className="p-1.5 rounded transition-colors flex-shrink-0"
                style={{
                  color: btn.active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                  background: btn.active ? 'var(--accent)' : 'transparent',
                }}
              >
                {btn.icon}
              </button>
            )
          )}

          {/* Template button — shown when editor is empty */}
          {isEmpty && (
            <>
              <div
                className="w-px h-4 mx-1 flex-shrink-0"
                style={{ backgroundColor: 'var(--border)' }}
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); insertTemplate() }}
                title="Insertar plantilla HOOK / DESARROLLO / CTA"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex-shrink-0"
                style={{
                  color: 'var(--muted-foreground)',
                  border: '1px dashed var(--border)',
                }}
              >
                <LayoutTemplate size={11} />
                Usar plantilla
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Editor area ── */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5 cursor-text"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>

      {/* ── Footer ── */}
      <div
        className="px-5 py-2 border-t flex-shrink-0 flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Save state */}
        <p className="text-[10px]" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
          {saveState === 'saving' && 'Guardando…'}
          {saveState === 'saved'  && 'Guardado ✓'}
          {saveState === 'idle'   && ''}
        </p>

        {/* Word count + duration */}
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
          <span>{wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}</span>
          {duration && (
            <>
              <span>·</span>
              <Clock size={9} />
              <span>{duration}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        .tiptap-guion {
          min-height: 380px;
          font-size: 0.875rem;
          line-height: 1.8;
          color: var(--foreground);
        }
        .tiptap-guion p { margin: 0 0 0.75em; }
        .tiptap-guion p:last-child { margin-bottom: 0; }
        .tiptap-guion h2 {
          font-size: 0.8125rem;
          font-weight: 700;
          margin: 1.4em 0 0.4em;
          color: var(--muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .tiptap-guion h2:first-child { margin-top: 0; }
        .tiptap-guion ul,
        .tiptap-guion ol { padding-left: 1.5em; margin: 0.4em 0 0.75em; }
        .tiptap-guion li { margin: 0.2em 0; }
        .tiptap-guion strong { font-weight: 700; }
        .tiptap-guion em { font-style: italic; }
        .tiptap-guion s { opacity: 0.6; }
        .tiptap-guion hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 1.25em 0;
        }
        .tiptap-guion .tiptap-placeholder::before {
          content: attr(data-placeholder);
          color: var(--muted-foreground);
          opacity: 0.35;
          float: left;
          pointer-events: none;
          height: 0;
          white-space: pre-line;
        }
      `}</style>
    </div>
  )
}
