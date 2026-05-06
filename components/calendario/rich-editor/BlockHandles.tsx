import type { Editor } from '@tiptap/core'
import { Plus, GripVertical } from 'lucide-react'

export type BlockHandleState = { x: number; y: number; nodePos: number; blockSize: number } | null
export type BlockMenuState = { x: number; y: number; nodePos: number; blockSize: number } | null
export type BlockPickerState = { x: number; y: number; insertPos: number } | null

interface BlockHandlesProps {
  editor: Editor
  blockHandle: NonNullable<BlockHandleState>
  blockMenu: BlockMenuState
  blockPicker: BlockPickerState
  setBlockMenu: (v: BlockMenuState) => void
  setBlockMenuSearch: (v: string) => void
  setBlockConvertMenu: (v: boolean) => void
  setBlockPicker: (v: BlockPickerState) => void
  setBlockPickerSearch: (v: string) => void
  cancelHideBlockHandle: () => void
  scheduleHideBlockHandle: () => void
}

// Block handles — + and ⠿ appearing left of any hovered block
export function BlockHandles({
  editor,
  blockHandle,
  blockMenu,
  blockPicker,
  setBlockMenu,
  setBlockMenuSearch,
  setBlockConvertMenu,
  setBlockPicker,
  setBlockPickerSearch,
  cancelHideBlockHandle,
  scheduleHideBlockHandle,
}: BlockHandlesProps) {
  return (
    <div
      data-block-handle
      className="fixed z-[53] flex items-center gap-0.5"
      style={{ top: blockHandle.y - 2, left: blockHandle.x }}
      onMouseEnter={cancelHideBlockHandle}
      onMouseLeave={scheduleHideBlockHandle}
    >
      {/* + open block picker */}
      <button
        aria-label="Añadir bloque"
        onMouseDown={(e) => {
          e.preventDefault()
          const insertPos = blockHandle.nodePos + blockHandle.blockSize
          const rect = e.currentTarget.getBoundingClientRect()
          if (blockPicker) { setBlockPicker(null); setBlockPickerSearch('') }
          else {
            setBlockMenu(null)
            setBlockPicker({ x: rect.left, y: rect.bottom + 6, insertPos })
            setBlockPickerSearch('')
          }
        }}
        className="flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer"
        style={{
          width: 28, height: 28,
          color: 'var(--muted-foreground)',
          opacity: 0.45,
          backgroundColor: 'transparent',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.backgroundColor = 'var(--muted)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.45'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
        title="Añadir bloque abajo"
      >
        <Plus size={15} strokeWidth={2} />
      </button>

      {/* Drag / block menu handle */}
      <button
        aria-label="Mover o abrir menú del bloque"
        draggable
        onMouseDown={(e) => {
          e.preventDefault()
          editor.commands.setNodeSelection(blockHandle.nodePos)
        }}
        onClick={(e) => {
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          if (blockMenu) { setBlockMenu(null); setBlockMenuSearch(''); setBlockConvertMenu(false) }
          else {
            setBlockPicker(null)
            setBlockMenu({ x: rect.right + 4, y: rect.top, nodePos: blockHandle.nodePos, blockSize: blockHandle.blockSize })
            setBlockMenuSearch('')
            setBlockConvertMenu(false)
          }
        }}
        onDragStart={(e) => {
          editor.commands.setNodeSelection(blockHandle.nodePos)
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('application/x-block-drag', JSON.stringify({
            pos: blockHandle.nodePos,
            size: blockHandle.blockSize,
          }))
          const domNode = editor.view.nodeDOM(blockHandle.nodePos)
          if (domNode instanceof HTMLElement) {
            e.dataTransfer.setDragImage(domNode, 16, 16)
          }
          setBlockMenu(null)
        }}
        className="flex items-center justify-center rounded-md transition-all duration-150 cursor-grab active:cursor-grabbing"
        style={{
          width: 28, height: 28,
          color: 'var(--muted-foreground)',
          opacity: 0.45,
          backgroundColor: 'transparent',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.backgroundColor = 'var(--muted)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.45'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
        title="Arrastrar para mover · Clic para opciones"
      >
        <GripVertical size={15} strokeWidth={2} />
      </button>
    </div>
  )
}
