import { ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import { DetailsNode, TaskItemView } from './nodes'

// ── Tiptap extensions factory ────────────────────────────────────────────────
export function getExtensions(placeholder?: string) {
  return [
    StarterKit,
    Placeholder.configure({
      placeholder: placeholder ?? "Escribe «/» para mostrar los comandos",
    }),
    TextStyle,
    Color,
    TaskList,
    TaskItem.extend({
      addNodeView() {
        return ReactNodeViewRenderer(TaskItemView)
      },
    }).configure({ nested: false }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          backgroundColor: {
            default: null,
            parseHTML: (el) => el.getAttribute('data-background-color'),
            renderHTML: (attrs) => {
              if (!attrs.backgroundColor) return {}
              return { 'data-background-color': attrs.backgroundColor, style: `background-color: ${attrs.backgroundColor}` }
            },
          },
        }
      },
    }),
    DetailsNode,
  ]
}
