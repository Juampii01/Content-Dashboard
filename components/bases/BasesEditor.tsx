'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { EditorToolbar } from './EditorToolbar'
import { BASES_SECTIONS } from './BasesTabNav'

type SaveStatus = 'idle' | 'saving' | 'saved'

const PLACEHOLDERS: Record<string, string> = {
  'cliente-ideal': 'Describe a tu cliente ideal: edad, ocupación, intereses, comportamientos...',
  'problemas': 'Lista los principales problemas que enfrenta tu audiencia...',
  'dolores': 'Describe los dolores emocionales y prácticos de tu cliente...',
  'deseos': 'Qué es lo que más desea tu cliente ideal conseguir...',
  'oferta': 'Describe tu oferta: qué incluye, precio, transformación que entrega...',
  'keywords': 'Palabras clave que usa tu audiencia, términos de búsqueda, hashtags...',
  'insights': 'Observaciones y aprendizajes clave sobre tu nicho y audiencia...',
  'competencia': 'Analiza a tu competencia: fortalezas, debilidades, qué los diferencia...',
}

interface BasesEditorProps {
  sectionId: string
}

export function BasesEditor({ sectionId }: BasesEditorProps) {
  const saveTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const section = BASES_SECTIONS.find((s) => s.id === sectionId)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: PLACEHOLDERS[sectionId] ?? 'Empieza a escribir...',
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setSaveStatus('saving')
      if (saveTimeoutRef.current)  clearTimeout(saveTimeoutRef.current)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        const html = editor.getHTML()
        fetch(`/api/bases/${sectionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: html }),
        })
          .then(() => {
            setSaveStatus('saved')
            savedTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
          })
          .catch(() => {
            setSaveStatus('idle')
          })
      }, 600)
    },
    editorProps: {
      attributes: {
        class: 'prose-editor outline-none min-h-[320px] px-6 py-5',
      },
    },
  })

  // Load content from API when sectionId changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset status on sectionId change before fetch
    setSaveStatus('idle')
    if (saveTimeoutRef.current)  clearTimeout(saveTimeoutRef.current)
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    if (!editor) return

    fetch(`/api/bases/${sectionId}`)
      .then((r) => r.json())
      .then((row) => {
        const html = row?.content ?? ''
        if (editor.getHTML() !== html) {
          editor.commands.setContent(html || '')
        }
      })
      .catch(() => {})
  }, [sectionId, editor])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current)  clearTimeout(saveTimeoutRef.current)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    }
  }, [])

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden flex-1"
      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
    >
      {/* Section title */}
      <div
        className="flex items-center justify-between gap-2 px-5 py-3.5 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          {section?.Icon && <section.Icon className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />}
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {section?.label}
          </h2>
        </div>

        {/* Save status indicator */}
        <div className="flex items-center gap-1.5 text-xs transition-opacity duration-300"
          style={{ opacity: saveStatus === 'idle' ? 0 : 1, color: saveStatus === 'saved' ? '#4ade80' : 'var(--muted-foreground)' }}>
          {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin" />}
          {saveStatus === 'saved'  && <CheckCircle2 size={12} />}
          <span>{saveStatus === 'saving' ? 'Guardando…' : 'Guardado'}</span>
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
