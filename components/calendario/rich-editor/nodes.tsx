import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/core'
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'

// ── Custom Details (Desplegable) node ────────────────────────────────────────
function DetailsView({ node, updateAttributes }: NodeViewProps) {
  const isOpen = node.attrs.open as boolean
  return (
    <NodeViewWrapper>
      <div>
        <div
          contentEditable={false}
          onClick={() => updateAttributes({ open: !isOpen })}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '2px 0',
            userSelect: 'none',
            color: 'var(--foreground)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.15s',
              transform: isOpen ? 'rotate(90deg)' : 'none',
              fontSize: 10,
              color: 'var(--muted-foreground)',
              lineHeight: 1,
            }}
          >
            ▶
          </span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Detalles</span>
        </div>
        <div
          style={{
            borderLeft: '2px solid var(--border)',
            paddingLeft: 12,
            marginLeft: 4,
            display: isOpen ? 'block' : 'none',
          }}
        >
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const DetailsNode = TiptapNode.create({
  name: 'details',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  addAttributes() {
    return { open: { default: true } }
  },
  parseHTML() {
    return [{ tag: 'details' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes), 0]
  },
  addNodeView() {
    return ReactNodeViewRenderer(DetailsView)
  },
})

// ── Custom TaskItem node view (custom checkbox, no native browser styling) ────
export function TaskItemView({ node, updateAttributes, editor }: NodeViewProps) {
  const checked = node.attrs.checked as boolean
  return (
    <NodeViewWrapper as="li" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '1px 0', minHeight: 22, listStyle: 'none' }}>
      {/* Custom checkbox — contentEditable=false so clicks work inside editor */}
      <span
        contentEditable={false}
        onClick={() => { if (editor.isEditable) updateAttributes({ checked: !checked }) }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          minWidth: 14,
          borderRadius: 3,
          border: checked ? '1.5px solid var(--accent)' : '1.5px solid var(--muted-foreground)',
          backgroundColor: checked ? 'var(--accent)' : 'transparent',
          cursor: editor.isEditable ? 'pointer' : 'default',
          flexShrink: 0,
          transition: 'border-color 120ms ease, background-color 120ms ease',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none" style={{ display: 'block' }}>
            <path d="M1.5 3L3.5 5.5L7.5 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {/* Editable content area */}
      <NodeViewContent
        as="div"
        style={{
          flex: 1,
          lineHeight: 1.5,
          textDecoration: checked ? 'line-through' : 'none',
          opacity: checked ? 0.45 : 1,
          transition: 'opacity 120ms ease',
        }}
      />
    </NodeViewWrapper>
  )
}
