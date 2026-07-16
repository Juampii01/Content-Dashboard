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
  Smartphone, Zap, Layers, Megaphone, Scissors,
} from 'lucide-react'
import type { GuionItem } from '@/lib/types'
import { GuionPhonePreview } from './GuionPhonePreview'

// ─── Constants ────────────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  { value: 'conversacional y directo',   label: 'Conversacional' },
  { value: 'profesional y confiable',    label: 'Profesional' },
  { value: 'inspiracional y motivador',  label: 'Inspiracional' },
  { value: 'urgente y persuasivo',       label: 'Urgente' },
]

const WPM: Record<string, number> = { reel: 150, historia: 175 }
const TARGET_SEC: Record<string, number> = { reel: 60, historia: 30 }

const TYPE_LABELS: Record<string, string> = {
  reel: 'Reel',
  historia: 'Historia',
}

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

type AIAction = 'rewrite_hook' | 'hook_variants' | 'punch_cta' | 'tighten'

const AI_ACTIONS: { key: AIAction; label: string; icon: typeof Zap; title: string }[] = [
  { key: 'rewrite_hook', label: 'Reescribir hook', icon: Zap,       title: 'Reescribir el gancho de apertura' },
  { key: 'hook_variants', label: '3 hooks',        icon: Layers,    title: 'Generar 3 hooks alternativos' },
  { key: 'punch_cta',    label: 'Afilar CTA',      icon: Megaphone, title: 'Reescribir el llamado a la acción' },
  { key: 'tighten',      label: 'Achicar a 30s',   icon: Scissors,  title: 'Recortar el guión a ~30 segundos' },
]

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
  const [showPreview, setShowPreview]     = useState(true)
  const [aiActionLoading, setAiActionLoading] = useState<AIAction | null>(null)
  const [hookVariants, setHookVariants]   = useState<string[] | null>(null)

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

  function flashSaved() {
    setSaveState('saved')
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaveState('idle'), 3000)
  }

  // Insert plain text (may be multi-line) at the current cursor position.
  // The editor's own onUpdate handler schedules the autosave afterwards.
  function insertAtCursor(text: string) {
    if (!editor) return
    editor.chain().focus().insertContent(toHTML(text)).run()
  }

  async function runAIAction(action: AIAction) {
    if (!activeItem || !editor || aiActionLoading) return
    const script = editor.getText().trim()
    if (!script) return
    setAiActionLoading(action)
    setAiError(null)
    if (action !== 'hook_variants') setHookVariants(null)
    try {
      const res = await fetch('/api/guiones/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          script,
          type: (type === 'reel' || type === 'historia') ? type : 'reel',
          tone: aiTone,
        }),
      })
      const data = (await res.json()) as { content?: string; variants?: string[]; error?: string }
      if (!res.ok) {
        setAiError(data.error ?? 'Error al procesar la acción')
        return
      }
      if (action === 'hook_variants') {
        setHookVariants(data.variants ?? [])
      } else if (action === 'tighten' && data.content) {
        const html = toHTML(data.content)
        isLoadingRef.current = true
        editor.commands.setContent(html)
        Promise.resolve().then(() => { isLoadingRef.current = false })
        onUpdate({ content: html })
        flashSaved()
      } else if (data.content) {
        insertAtCursor(data.content)
      }
    } catch {
      setAiError('Error de conexión. Intentá de nuevo.')
    } finally {
      setAiActionLoading(null)
    }
  }

  // ─── Empty / no-item state ──────────────────────────────────────────────────

  if (!activeItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-7 px-10 py-16 text-center">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent) 6%, transparent))',
            boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent), var(--shadow-card-sm)',
          }}
        >
          {hasTabs
            ? <FileText size={34} style={{ color: 'var(--accent)' }} />
            : <FolderOpen size={34} style={{ color: 'var(--accent)' }} />
          }
        </div>

        {/* Text */}
        <div className="space-y-2.5 max-w-sm">
          <p className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            {hasTabs ? 'Seleccioná un guión' : 'Tu espacio de escritura'}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
            {hasTabs
              ? 'Elegí un guión del panel de la izquierda, o creá uno nuevo dentro de cualquier carpeta para empezar a escribir.'
              : 'Un lugar tranquilo para dar forma a tus reels e historias. Creá tu primera carpeta para empezar.'}
          </p>
        </div>

        {/* Hint */}
        <div
          className="flex items-center gap-2.5 px-4 py-2 rounded-full text-[13px] font-medium"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            color: 'var(--accent)',
          }}
        >
          {hasTabs ? <FileText size={14} /> : <FolderOpen size={14} />}
          {hasTabs ? 'Abrí un guión del panel izquierdo' : 'Empezá con el botón + de la izquierda'}
        </div>
      </div>
    )
  }

  // ─── Computed ───────────────────────────────────────────────────────────────

  const wordCount = editor?.getText().split(/\s+/).filter(Boolean).length ?? 0
  const duration  = estimateDuration(wordCount, type)
  const target    = targetWords(type)
  const progress  = Math.min(wordCount / target, 1)
  const isEmpty   = wordCount === 0
  const typeLabel = TYPE_LABELS[type ?? ''] ?? null

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

      {/* ── Title area ── */}
      <div
        className="px-6 sm:px-10 pt-7 pb-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
       <div className="mx-auto w-full max-w-2xl">
        {/* Type badge + save indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {typeLabel && (
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
                }}
              >
                {typeLabel}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Save indicator */}
            <span
              className="text-[11px] font-medium flex items-center gap-1.5 mr-1 transition-opacity"
              style={{
                color: saveState === 'saved' ? 'color-mix(in srgb, #22c55e 70%, var(--muted-foreground))' : 'var(--muted-foreground)',
                opacity: saveState === 'idle' ? 0 : 0.7,
              }}
            >
              {saveState === 'saving' && (
                <><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />Guardando…</>
              )}
              {saveState === 'saved' && (
                <><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Guardado</>
              )}
            </span>

            {/* Phone preview toggle (wide screens) */}
            <button
              onClick={() => setShowPreview((p) => !p)}
              title={showPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
              style={{
                background: showPreview ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--muted)',
                color: showPreview ? 'var(--accent)' : 'var(--muted-foreground)',
                border: showPreview ? '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' : '1px solid transparent',
              }}
            >
              <Smartphone size={12} />
              <span className="hidden xl:inline">Preview</span>
            </button>

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
              className="p-1.5 rounded-lg transition-all cursor-pointer opacity-30 hover:opacity-70"
              style={{ color: 'var(--destructive, #ef4444)' }}
              title="Eliminar guión"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Title input — big, Notion-style */}
        <input
          value={localTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Sin título"
          className="w-full text-[1.75rem] font-bold tracking-tight bg-transparent outline-none placeholder:opacity-25"
          style={{ color: 'var(--foreground)', lineHeight: '1.25' }}
        />
       </div>
      </div>

      {/* ── AI Panel ── */}
      {showAIPanel && (
        <div
          className="px-6 sm:px-10 py-4 flex-shrink-0"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'color-mix(in srgb, var(--accent) 5%, var(--card))',
          }}
        >
         <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
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
                <p className="text-[11px]" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
                  Objetivo: ~{TARGET_SEC[type ?? ''] ?? 60} seg · {targetWords(type)} palabras
                </p>
              </div>
            </div>
            <button
              onClick={() => { setShowAIPanel(false); setAiError(null) }}
              className="p-1 rounded-lg opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
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
                background: 'var(--card)',
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
                  background: 'var(--card)',
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 cursor-pointer"
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
        </div>
      )}

      {/* ── Formatting toolbar ── */}
      {editor && (
        <div
          className="flex items-center gap-0.5 px-6 sm:px-10 py-2 flex-shrink-0"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'color-mix(in srgb, var(--foreground) 1.5%, var(--card))',
          }}
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
                  background: btn.active ? 'var(--accent)' : 'transparent',
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

          {/* Template button (only when empty) */}
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
              Plantilla
            </button>
          )}
        </div>
      )}

      {/* ── AI section actions bar ── */}
      {!isEmpty && (
        <div
          className="flex items-center gap-1.5 px-6 sm:px-10 py-2 flex-shrink-0 overflow-x-auto"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'color-mix(in srgb, var(--accent) 3.5%, var(--card))',
            scrollbarWidth: 'none',
          }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.14em] flex items-center gap-1.5 flex-shrink-0 mr-1"
            style={{ color: 'var(--accent)' }}
          >
            <Sparkles size={11} />
            Afinar IA
          </span>
          {AI_ACTIONS.map(({ key, label, icon: Icon, title: btnTitle }) => {
            const loading = aiActionLoading === key
            return (
              <button
                key={key}
                onClick={() => void runAIAction(key)}
                disabled={aiActionLoading !== null}
                title={btnTitle}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                style={{
                  color: 'var(--muted-foreground)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => {
                  if (aiActionLoading !== null) return
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 40%, transparent)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 8%, transparent)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--muted-foreground)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {loading ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Hook variants panel ── */}
      {hookVariants && (
        <div
          className="px-6 sm:px-10 py-3 flex-shrink-0"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'color-mix(in srgb, var(--accent) 5%, var(--card))',
          }}
        >
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
                <Layers size={12} style={{ color: 'var(--accent)' }} />
                Elegí un hook — se inserta donde está el cursor
              </p>
              <button
                onClick={() => setHookVariants(null)}
                className="p-1 rounded-lg opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X size={13} />
              </button>
            </div>
            {hookVariants.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
                No se generaron variantes. Probá de nuevo.
              </p>
            ) : (
              <div className="space-y-1.5">
                {hookVariants.map((variant, i) => (
                  <button
                    key={i}
                    onClick={() => { insertAtCursor(variant); setHookVariants(null) }}
                    className="flex items-start gap-2.5 w-full text-left p-2.5 rounded-xl text-[13px] leading-snug transition-all cursor-pointer"
                    style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 40%, transparent)'
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 6%, var(--card))'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--card)'
                    }}
                  >
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-px"
                      style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}
                    >
                      {i + 1}
                    </span>
                    <span>{variant}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Editor area (+ live phone preview) ── */}
      <div className="flex-1 flex min-h-0">
       <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {isEmpty && !showAIPanel ? (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Clickable editor area */}
          <div
            className="px-6 sm:px-10 pt-8 cursor-text"
            onClick={() => editor?.commands.focus()}
          >
            <div className="mx-auto w-full max-w-2xl">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Start CTA cards */}
          <div className="mx-auto w-full max-w-2xl px-6 sm:px-10 pb-10 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={insertTemplate}
              className="flex items-start gap-3 p-4 rounded-2xl text-left transition-all cursor-pointer group"
              style={{
                backgroundColor: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--foreground) 20%, transparent)'
                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 4%, var(--muted))'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.backgroundColor = 'var(--muted)'
              }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 8%, transparent)' }}
              >
                <LayoutTemplate size={15} style={{ color: 'var(--foreground)', opacity: 0.6 }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Usar plantilla</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--muted-foreground)' }}>
                  Hook, Desarrollo y CTA listos para completar
                </p>
              </div>
            </button>

            <button
              onClick={() => { setShowAIPanel(true); setAiError(null) }}
              className="flex items-start gap-3 p-4 rounded-2xl text-left transition-all cursor-pointer"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 13%, transparent)'
                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 35%, transparent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 8%, transparent)'
                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 18%, transparent)'
              }}
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
                  Describí el tema y la IA escribe por vos
                </p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 cursor-text"
          onClick={() => editor?.commands.focus()}
        >
          <div className="mx-auto w-full max-w-2xl">
            <EditorContent editor={editor} />
          </div>
        </div>
        )}
       </div>

       {/* Live phone preview (wide screens) */}
       {showPreview && (
         <aside
           className="hidden lg:flex flex-shrink-0 w-[340px] overflow-y-auto flex-col items-center px-5 py-6"
           style={{
             borderLeft: '1px solid var(--border)',
             background: 'color-mix(in srgb, var(--foreground) 2%, var(--card))',
             scrollbarWidth: 'none',
           }}
         >
           <GuionPhonePreview
             title={localTitle}
             html={editor?.getHTML() ?? ''}
             typeLabel={typeLabel}
             wordCount={wordCount}
             duration={duration}
           />
         </aside>
       )}
      </div>

      {/* ── Footer ── */}
      <div
        className="px-6 sm:px-10 py-3 flex-shrink-0 flex items-center gap-4"
        style={{
          borderTop: '1px solid var(--border)',
          background: 'color-mix(in srgb, var(--foreground) 1.5%, var(--card))',
        }}
      >
        {/* Word count + duration */}
        <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: 'var(--muted-foreground)' }}>
          <span className="tabular-nums">{wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}</span>
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
          <div className="flex items-center gap-2.5 flex-1 max-w-[200px]">
            <div
              className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: progress >= 1
                    ? 'color-mix(in srgb, #22c55e 80%, transparent)'
                    : 'var(--accent)',
                }}
              />
            </div>
            <span
              className="text-[10px] flex-shrink-0 tabular-nums"
              style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}
            >
              {Math.round(progress * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* ── Styles ── */}
      <style>{`
        .tiptap-guion {
          min-height: 320px;
          font-size: 1.0625rem;
          line-height: 1.85;
          letter-spacing: -0.003em;
          color: color-mix(in srgb, var(--foreground) 92%, transparent);
        }
        .tiptap-guion p { margin: 0 0 0.9em; }
        .tiptap-guion p:last-child { margin-bottom: 0; }
        .tiptap-guion h2 {
          font-size: 0.72rem;
          font-weight: 800;
          margin: 2.1em 0 0.65em;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: flex;
          align-items: center;
          gap: 0.5em;
          opacity: 0.9;
        }
        .tiptap-guion h2:first-child { margin-top: 0; }
        .tiptap-guion ul,
        .tiptap-guion ol { padding-left: 1.5em; margin: 0.4em 0 0.85em; }
        .tiptap-guion li { margin: 0.3em 0; }
        .tiptap-guion strong { font-weight: 700; }
        .tiptap-guion em { font-style: italic; }
        .tiptap-guion s { opacity: 0.4; text-decoration-color: var(--muted-foreground); }
        .tiptap-guion hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 1.75em 0;
        }
        .tiptap-guion .tiptap-placeholder::before {
          content: attr(data-placeholder);
          color: var(--muted-foreground);
          opacity: 0.25;
          float: left;
          pointer-events: none;
          height: 0;
          white-space: pre-line;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
