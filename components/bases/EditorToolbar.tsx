'use client'

import type { Editor } from '@tiptap/react'
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Quote, Undo, Redo } from 'lucide-react'

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}

function ToolbarButton({ onClick, active, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded-md transition-all disabled:opacity-30 cursor-pointer"
      style={{
        backgroundColor: active ? 'var(--accent)' : 'transparent',
        // when active, the background IS var(--accent) → use foreground that sits on it
        color: active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  return (
    <div
      className="flex items-center gap-0.5 px-3 py-2 border-b flex-wrap"
      style={{ borderColor: 'var(--border)' }}
    >
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Negrita"
      >
        <Bold size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Cursiva"
      >
        <Italic size={14} />
      </ToolbarButton>

      <div className="w-px h-4 mx-1 self-center" style={{ backgroundColor: 'var(--border)' }} />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Título H2"
      >
        <Heading2 size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Título H3"
      >
        <Heading3 size={14} />
      </ToolbarButton>

      <div className="w-px h-4 mx-1 self-center" style={{ backgroundColor: 'var(--border)' }} />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Lista"
      >
        <List size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Lista numerada"
      >
        <ListOrdered size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Cita"
      >
        <Quote size={14} />
      </ToolbarButton>

      <div className="flex-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Deshacer"
      >
        <Undo size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Rehacer"
      >
        <Redo size={14} />
      </ToolbarButton>

      {/* AI button — disabled, coming soon */}
      <div className="w-px h-4 mx-1 self-center" style={{ backgroundColor: 'var(--border)' }} />
      <button
        disabled
        title="Próximamente"
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium opacity-40 cursor-not-allowed"
        style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
      >
        ✦ Generar con IA
        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 13%, transparent)', color: 'var(--accent)' }}>
          Próximamente
        </span>
      </button>
    </div>
  )
}
