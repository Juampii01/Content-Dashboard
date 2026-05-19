'use client'

import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Trash2, FileText, Sparkles, Loader2, X,
  Bold, Italic, List, ListOrdered, Heading2,
  Copy, Check, LayoutTemplate, Strikethrough,
  Minus, Clock, Wand2, FolderOpen,
} from 'lucide-react'
import type { GuionItem } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  { value: 'conversacional y directo',   label: 'Conversacional' },
  { value: 'profesional y confiable',    label: 'Profesional' },
  { value: 'inspiracional y motivador',  label: 'Inspiracional' },
  { value: 'urgente y persuasivo',       label: 'Urgente' },
]

const WPM: Record<string, number> = { reel: 150, historia: 175 }
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

function targetWords(type?: string): number {
  const sec = TARGET_SEC[type ?? ''] ?? TARGET_SEC.reel
  const wpm = WPM[type ?? ''] ?? WPM.reel
  return Math.round((sec / 60) * wpm)
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
  const [showAIPanel, setShowAIPanel]     = useState(false)
  const [aiTopic, setAiTopic]             = useState('')
  const [aiTone, setAiTone]               = useState(TONE_OPTIONS[0].value)
  const [isGenerating, setIsGenerating]   = useState(false)
  const [aiError, setAiError]             = useState<string | null>(null)
  const [saveState, setSaveState]         = useState<SaveState>('idle')
  const [copied, setCopied]               = useState(false)
  const [localTitle, setLocalTitle]       = useState(activeItem?.title ?? '')

  const prevItemIdRef   = useRef<string | null>(null)
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onUpdateRef     = useRef(onUpdate)
  const saveTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingRef    = useRef(false)

  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  // ─── TipTap ─────────────────────────────────────────────────────────────────

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `Escribí el guión de tu ${label} aquí…`,
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

  useEffect(() => {
    if (!editor || !activeItem) return
    if (prevItemIdRef.current === activeItem.id) return
    prevItemIdRef.current = activeItem.id
    setLocalTitle(activeItem.title)
    setSaveState('idle')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    isLoadingRef.current = true
    editor.commands.setContent(toHTML(activeItem.content))
    Promise.resolve().then(() => { isLoadingRef.current = false })
  }, [editor, activeItem])

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
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            border: '1.5px solid color-mix(in srgb, var(--accent) 22%, transparent)',
          }}
        >
          <FileText size={26} style={{ color: 'var(--accent)', opacity: 0.7 }} />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            {hasTabs ? 'Seleccioná o creá un guión' : 'Creá una carpeta para empezar'}
          </p>
          <p className="text-sm mt-1.5" style={{ color: 'var(--muted-foreground)', opacity: 0.65 }}>
            {hasTabs
              ? 'Hacé clic en un guión del panel izquierdo, o creá uno nuevo con el botón +'
              : 'Usá el botón "Nueva" en el panel izquierdo para crear tu primera carpeta de guiones'}
          </p>
        </div>
        {!hasTabs && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
            }}
          >
            <FolderOpen size={13} />
            Panel izquierdo → Nueva
          </div>
        )}
      </div>
    )
  }

  // ─── Computed ───────────────────────────────────────────────────────────────

  const wordCount  = editor?.getText().split(/\s+/).filter(Boolean).length ?? 0
  const duration   = estimateDuration(wordCount, type)
  const target     = targetWords(type)
  const progress   = Math.min(wordCount / target, 1)
  const isEmpty    = wordCount === 0

  const toolbarButtons = editor ? [
    { icon: <Bold size={13} />, title: 'Negrita (⌘B)', active: editor.isActive('bold'), action: () => editor.chain().focus().toggleBold().run() },
    { icon: <Italic size={13} />, title: 'Cursiva (⌘I)', active: editor.isActive('italic'), action: () => editor.chain().focus().toggleItalic().run() },
    { icon: <Strikethrough size={13} />, title: 'Tachado', active: editor.isActive('strike'), action: () => editor.chain().focus().toggleStrike().run() },
    null,
    { icon: <Heading2 size={13} />, title: 'Sección (H2)', active: editor.isActive('heading', { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    null,
    { icon: <List size={13} />, title: 'Lista', active: editor.isActive('bulletList'), action: () => editor.chain().focus().toggleBulletList().run() },
    { icon: <ListOrdered size={13} />, title: 'Lista numerada', active: editor.isActive('orderedList'), action: () => editor.chain().focus().toggleOrderedList().run() },
    null,
    { icon: <Minus size={13} />, title: 'Separador', active: false, action: () => editor.chain().focus().setHorizontalRule().run() },
  ] : []

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">

      {/* ── Title bar ── */}
      <div
        className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <input
          value={localTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Título del guión"
          className="flex-1 text-base font-bold bg-transparent outline-none min-w-0"
          style={{ color: 'var(--foreground)' }}
        />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Save indicator */}
          <span className="text-[11px] font-medium flex items-center gap-1.5 mr-1" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
            {saveState === 'saving' && (
              <><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />Guardando</>
            )}
            {saveState === 'saved' && (
              <><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Guardado</>
            )}
          </span>

          {/* Copy */}
          <button
            onClick={handleCopy}
            title="Copiar guión completo"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
            style={{
              background: copied ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--muted)',
              color: copied ? 'var(--accent)' : 'var(--muted-foreground)',
              border: copied ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' : '1px solid transparent',
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          {/* AI Generate */}
          <button
            onClick={() => { setShowAIPanel((p) => !p); setAiError(null) }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            title="Generar con IA"
            style={{
              background: showAIPanel
                ? 'var(--accent)'
                : 'color-mix(in srgb, var(--accent) 12%, transparent)',
              color: showAIPanel ? 'var(--accent-foreground)' : 'var(--accent)',
              border: showAIPanel
                ? 'none'
                : '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            }}
          >
            <Wand2 size={12} />
            <span className="hidden sm:inline">IA</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(activeItem.id)}
            className="p-1.5 rounded-lg transition-all cursor-pointer opacity-40 hover:opacity-80"
            style={{ color: 'var(--destructive, #ef4444)' }}
            title="Eliminar guión"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── AI Panel ── */}
      {showAIPanel && (
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'color-mix(in srgb, var(--accent) 5%, var(--card))',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent)' }}
              >
                <Sparkles size={13} style={{ color: 'var(--accent-foreground)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Generar guión con IA
                </p>
                <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                  Objetivo: ~{TARGET_SEC[type ?? ''] ?? 60} seg — {targetWords(type)} palabras
                </p>
              </div>
            </div>
            <button
              onClick={() => { setShowAIPanel(false); setAiError(null) }}
              className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
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
              placeholder={`Ej: 3 errores que comete todo emprendedor al arrancar`}
              className="flex-1 text-sm px-3.5 py-2.5 rounded-xl outline-none"
              style={{
                background: 'var(--background)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
              disabled={isGenerating}
              autoFocus
            />
            <div className="flex gap-2">
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                className="text-sm px-3 py-2.5 rounded-xl outline-none cursor-pointer"
                style={{
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                {isGenerating
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Sparkles size={14} />}
                {isGenerating ? 'Generando…' : 'Generar'}
              </button>
            </div>
          </div>

          {aiError && (
            <p className="mt-2 text-xs" style={{ color: 'var(--destructive, #ef4444)' }}>
              {aiError}
            </p>
          )}
        </div>
      )}

      {/* ── Formatting toolbar ── */}
      {editor && (
        <div
          className="flex items-center gap-0.5 px-3 py-1.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
        >
          {toolbarButtons.map((btn, i) =>
            btn === null ? (
              <div key={`sep-${i}`} className="w-px h-3.5 mx-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--border)' }} />
            ) : (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); btn.action() }}
                title={btn.title}
                className="p-1.5 rounded-lg transition-all flex-shrink-0 cursor-pointer"
                style={{
                  color: btn.active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                  background: btn.active
                    ? 'var(--accent)'
                    : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!btn.active) e.currentTarget.style.background = 'var(--muted)'
                }}
                onMouseLeave={(e) => {
                  if (!btn.active) e.currentTarget.style.background = 'transparent'
                }}
              >
                {btn.icon}
              </button>
            )
          )}

          <div className="flex-1" />

          {/* Template button */}
          {isEmpty && (
            <button
              onMouseDown={(e) => { e.preventDefault(); insertTemplate() }}
              title="Insertar plantilla HOOK / DESARROLLO / CTA"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex-shrink-0"
              style={{
                color: 'var(--muted-foreground)',
                border: '1px dashed var(--border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--muted-foreground)'
              }}
            >
              <LayoutTemplate size={11} />
              Usar plantilla
            </button>
          )}
        </div>
      )}

      {/* ── Editor area + empty CTA ── */}
      {isEmpty && !showAIPanel ? (
        /* When editor is empty show two CTA cards */
        <div className="flex-1 flex flex-col">
          <div
            className="flex-1 overflow-y-auto px-6 py-5 cursor-text"
            onClick={() => editor?.commands.focus()}
          >
            <EditorContent editor={editor} />
          </div>

          <div className="px-6 pb-6 pt-2 flex gap-3">
            {/* Template CTA */}
            <button
              onClick={insertTemplate}
              className="flex-1 flex items-start gap-3 p-4 rounded-2xl text-left transition-all cursor-pointer group"
              style={{
                backgroundColor: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--foreground) 25%, transparent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 8%, transparent)' }}
              >
                <LayoutTemplate size={15} style={{ color: 'var(--foreground)', opacity: 0.7 }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Usar plantilla</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--muted-foreground)' }}>
                  Estructura con Hook, Desarrollo y CTA lista para completar
                </p>
              </div>
            </button>

            {/* AI CTA */}
            <button
              onClick={() => { setShowAIPanel(true); setAiError(null) }}
              className="flex-1 flex items-start gap-3 p-4 rounded-2xl text-left transition-all cursor-pointer"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 45%, transparent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 20%, transparent)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Wand2 size={15} style={{ color: 'var(--accent-foreground)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Generar con IA</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--muted-foreground)' }}>
                  Describí el tema y la IA escribe el guión completo por vos
                </p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto px-6 py-5 cursor-text"
          onClick={() => editor?.commands.focus()}
        >
          <EditorContent editor={editor} />
        </div>
      )}

      {/* ── Footer ── */}
      <div
        className="px-5 py-2.5 flex-shrink-0 flex items-center gap-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Word count + duration */}
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
          <span>{wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}</span>
          {duration && (
            <>
              <span>·</span>
              <Clock size={10} />
              <span>{duration}</span>
            </>
          )}
        </div>

        {/* Progress bar */}
        {wordCount > 0 && (
          <div className="flex items-center gap-2 flex-1">
            <div
              className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: progress >= 1
                    ? 'color-mix(in srgb, #22c55e 80%, transparent)'
                    : 'var(--accent)',
                }}
              />
            </div>
            <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
              /{target}
            </span>
          </div>
        )}
      </div>

      {/* ── Styles ── */}
      <style>{`
        .tiptap-guion {
          min-height: 300px;
          font-size: 0.9rem;
          line-height: 1.85;
          color: var(--foreground);
        }
        .tiptap-guion p { margin: 0 0 0.75em; }
        .tiptap-guion p:last-child { margin-bottom: 0; }
        .tiptap-guion h2 {
          font-size: 0.75rem;
          font-weight: 800;
          margin: 1.75em 0 0.5em;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
          gap: 0.5em;
        }
        .tiptap-guion h2:first-child { margin-top: 0; }
        .tiptap-guion ul,
        .tiptap-guion ol { padding-left: 1.5em; margin: 0.4em 0 0.75em; }
        .tiptap-guion li { margin: 0.25em 0; }
        .tiptap-guion strong { font-weight: 700; }
        .tiptap-guion em { font-style: italic; }
        .tiptap-guion s { opacity: 0.5; }
        .tiptap-guion hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 1.5em 0;
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
