'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { SLASH_ITEMS, type SlashItemId, type MenuState } from './rich-editor/constants'
import { getExtensions } from './rich-editor/extensions'
import { Tooltip, type TooltipState } from './rich-editor/Tooltip'
import { SlashMenu } from './rich-editor/SlashMenu'
import {
  BlockHandles,
  type BlockHandleState,
  type BlockMenuState,
  type BlockPickerState,
} from './rich-editor/BlockHandles'
import { BlockPicker } from './rich-editor/BlockPicker'
import { BlockContextMenu } from './rich-editor/BlockContextMenu'
import {
  TableOverlayButtons,
  RowHandle,
  ColHandle,
  ColumnContextMenu,
  type TableRect,
  type ColHandleState,
  type ColMenuState,
  type RowHandleState,
} from './rich-editor/TableControls'

// ── Component ─────────────────────────────────────────────────────────────────
interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const [menu, setMenu]           = useState<MenuState>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [tableRect, setTableRect] = useState<TableRect>(null)
  const [colHandle, setColHandle] = useState<ColHandleState>(null)
  const [colMenu,      setColMenu]      = useState<ColMenuState>(null)
  const [colSearch,    setColSearch]    = useState('')
  const [colColorMenu, setColColorMenu] = useState(false)
  const [tooltip,   setTooltip]   = useState<TooltipState>(null)
  const [rowHandle,   setRowHandle]   = useState<RowHandleState>(null)
  const [blockHandle, setBlockHandle] = useState<BlockHandleState>(null)
  const [blockMenu,   setBlockMenu]   = useState<BlockMenuState>(null)
  const [blockMenuSearch, setBlockMenuSearch] = useState('')
  const [blockConvertMenu, setBlockConvertMenu] = useState(false)
  const [blockPicker, setBlockPicker] = useState<BlockPickerState>(null)
  const [blockPickerSearch, setBlockPickerSearch] = useState('')
  const activeCellRef      = useRef<HTMLElement | null>(null)
  const activeRowRef       = useRef<HTMLElement | null>(null)
  const blockHandlePosRef  = useRef<number | null>(null)  // avoids re-renders on same block
  const hideBlockHandleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const menuContainerRef = useRef<HTMLDivElement>(null)
  // Refs to avoid stale closures in Tiptap's handleKeyDown
  const menuRef        = useRef<MenuState>(null)
  const selectedRef    = useRef(0)
  const filteredRef    = useRef<typeof SLASH_ITEMS[number][]>([])
  const editorRef      = useRef<Editor | null>(null)

  const filteredItems = useMemo(
    () =>
      menu
        ? SLASH_ITEMS.filter((i) => i.label.toLowerCase().includes(menu.query.toLowerCase()))
        : [],
    [menu],
  )

  // Keep refs in sync
  useEffect(() => { menuRef.current      = menu },          [menu])
  useEffect(() => { selectedRef.current  = selectedIdx },   [selectedIdx])
  useEffect(() => { filteredRef.current  = filteredItems }, [filteredItems])

  // ── Block handle show/hide debounce ────────────────────────────────────
  const scheduleHideBlockHandle = useCallback(() => {
    if (hideBlockHandleTimer.current) clearTimeout(hideBlockHandleTimer.current)
    hideBlockHandleTimer.current = setTimeout(() => {
      blockHandlePosRef.current = null
      setBlockHandle(null)
      hideBlockHandleTimer.current = null
    }, 250)
  }, [])

  const cancelHideBlockHandle = useCallback(() => {
    if (hideBlockHandleTimer.current) {
      clearTimeout(hideBlockHandleTimer.current)
      hideBlockHandleTimer.current = null
    }
  }, [])

  // ── Apply a block when user picks an option ──────────────────────────────
  const applyBlock = useCallback((blockId: SlashItemId) => {
    const currentMenu = menuRef.current
    const ed = editorRef.current
    if (!ed || !currentMenu) return

    const curFrom = ed.state.selection.from
    ed.chain().focus().deleteRange({ from: currentMenu.from, to: curFrom }).run()

    switch (blockId) {
      case 'paragraph':   ed.chain().focus().setParagraph().run(); break
      case 'h1':          ed.chain().focus().setHeading({ level: 1 }).run(); break
      case 'h2':          ed.chain().focus().setHeading({ level: 2 }).run(); break
      case 'h3':          ed.chain().focus().setHeading({ level: 3 }).run(); break
      case 'bulletList':  ed.chain().focus().toggleBulletList().run(); break
      case 'orderedList': ed.chain().focus().toggleOrderedList().run(); break
      case 'taskList':    ed.chain().focus().toggleTaskList().run(); break
      case 'details':
        ed.chain().focus().insertContent({
          type: 'details',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Título del desplegable' }] }],
        }).run()
        break
      case 'table':
        ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        break
      case 'blockquote':  ed.chain().focus().toggleBlockquote().run(); break
      case 'hr':          ed.chain().focus().setHorizontalRule().run(); break
    }

    setMenu(null)
  }, [])

  // ── Insert a new block of given type at a document position ─────────────
  // Strategy: insert an empty paragraph at insertPos (cursor moves into it via
  // insertContentAt's default updateSelection:true), then chain the type
  // transformation — mirrors the working applyBlock (slash menu) pattern exactly.
  const applyBlockInsert = useCallback((blockId: SlashItemId, insertPos: number) => {
    const ed = editorRef.current
    if (!ed) return

    if (blockId === 'table') {
      // Table needs its own command, not a paragraph transform
      ed.chain().focus()
        .insertContentAt(insertPos, { type: 'paragraph' })
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run()
    } else if (blockId === 'hr') {
      ed.chain().focus()
        .insertContentAt(insertPos, { type: 'horizontalRule' })
        .run()
    } else if (blockId === 'details') {
      ed.chain().focus()
        .insertContentAt(insertPos, {
          type: 'details',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Título del desplegable' }] }],
        })
        .run()
    } else {
      // Insert empty paragraph — cursor auto-moves inside it (updateSelection: true)
      // Then apply the same transformation commands as the slash menu uses
      const chain = ed.chain().focus().insertContentAt(insertPos, { type: 'paragraph' })
      switch (blockId) {
        case 'h1':          chain.setHeading({ level: 1 }).run(); break
        case 'h2':          chain.setHeading({ level: 2 }).run(); break
        case 'h3':          chain.setHeading({ level: 3 }).run(); break
        case 'bulletList':  chain.toggleBulletList().run(); break
        case 'orderedList': chain.toggleOrderedList().run(); break
        case 'taskList':    chain.toggleTaskList().run(); break
        case 'blockquote':  chain.toggleBlockquote().run(); break
        default:            chain.run(); break   // 'paragraph' — already done
      }
    }

    setBlockPicker(null)
    setBlockPickerSearch('')
  }, [])

  // ── Convert current block to another type ───────────────────────────────
  const applyBlockConvert = useCallback((blockId: SlashItemId, nodePos: number) => {
    const ed = editorRef.current
    if (!ed) return
    ed.chain().focus().setNodeSelection(nodePos).run()
    switch (blockId) {
      case 'paragraph':   ed.chain().focus().setParagraph().run(); break
      case 'h1':          ed.chain().focus().setHeading({ level: 1 }).run(); break
      case 'h2':          ed.chain().focus().setHeading({ level: 2 }).run(); break
      case 'h3':          ed.chain().focus().setHeading({ level: 3 }).run(); break
      case 'bulletList':  ed.chain().focus().toggleBulletList().run(); break
      case 'orderedList': ed.chain().focus().toggleOrderedList().run(); break
      case 'taskList':    ed.chain().focus().toggleTaskList().run(); break
      case 'blockquote':  ed.chain().focus().toggleBlockquote().run(); break
    }
    setBlockMenu(null)
    setBlockConvertMenu(false)
    setBlockMenuSearch('')
  }, [])

  // ── Table position tracker ───────────────────────────────────────────────
  const updateTableToolbar = useCallback((ed: Editor) => {
    if (!ed.isActive('table')) { setTableRect(null); return }
    try {
      const { from } = ed.state.selection
      const domInfo = ed.view.domAtPos(from)
      const node = domInfo.node as HTMLElement
      const tableEl = (node.closest ? node.closest('table') : null) as HTMLElement | null
        ?? (node.parentElement?.closest('table') as HTMLElement | null)
      if (!tableEl) { setTableRect(null); return }
      const r = tableEl.getBoundingClientRect()
      setTableRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[RichEditor] updateTableToolbar failed — resetting table rect', err)
      }
      setTableRect(null)
    }
  }, [])

  // ── Slash menu detection helper ──────────────────────────────────────────
  const updateSlashMenu = useCallback((ed: Editor) => {
    const { from } = ed.state.selection
    const textBefore = ed.state.doc.textBetween(Math.max(0, from - 60), from, '\n')
    const match = textBefore.match(/\/(\w*)$/)
    if (match) {
      const coords = ed.view.coordsAtPos(from)
      const viewportH = window.innerHeight
      const menuH = 320
      const top = coords.bottom + menuH > viewportH - 20
        ? Math.max(8, coords.top - menuH)
        : coords.bottom + 6
      setMenu({ x: coords.left, y: top, query: match[1], from: from - match[0].length })
      setSelectedIdx(0)
    } else {
      setMenu(null)
    }
  }, [])

  // ── Tiptap editor ────────────────────────────────────────────────────────
  const editor = useEditor({
    immediatelyRender: false, // SSR guard
    extensions: getExtensions(placeholder),
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: {
        class: 'prose-editor outline-none min-h-[120px] text-sm leading-relaxed',
        spellcheck: 'false',
        autocorrect: 'off',
        autocapitalize: 'off',
      },
      // Keyboard navigation — uses refs to avoid stale closure
      handleKeyDown: (_view, event) => {
        if (!menuRef.current) return false
        const items = filteredRef.current
        if (items.length === 0) return false

        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedIdx(i => Math.min(i + 1, items.length - 1))
          return true
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedIdx(i => Math.max(i - 1, 0))
          return true
        }
        if (event.key === 'Enter') {
          const item = items[selectedRef.current]
          if (item) { applyBlock(item.id); return true }
        }
        if (event.key === 'Escape') {
          setMenu(null)
          return true
        }
        return false
      },
      // Block drag-and-drop: handle drops from our external ⠿ handle
      handleDrop: (view, event) => {
        const raw = event.dataTransfer?.getData('application/x-block-drag')
        if (!raw) return false
        event.preventDefault()
        try {
          const { pos: fromPos, size: nodeSize } = JSON.parse(raw) as { pos: number; size: number }
          const dropResult = view.posAtCoords({ left: event.clientX, top: event.clientY })
          if (!dropResult) return true
          const resolved = view.state.doc.resolve(dropResult.pos)
          const toPos = resolved.depth >= 1 ? resolved.before(1) : dropResult.pos
          if (toPos === fromPos) return true
          const fromNode = view.state.doc.nodeAt(fromPos)
          if (!fromNode) return true
          const tr = view.state.tr
          tr.delete(fromPos, fromPos + nodeSize)
          const adjustedTo = fromPos < toPos ? toPos - nodeSize : toPos
          tr.insert(adjustedTo, fromNode)
          view.dispatch(tr)
        } catch { /* ignore */ }
        return true
      },
    },
  })

  useEffect(() => { editorRef.current = editor ?? null }, [editor])

  // Listen to editor events for slash menu + table controls
  useEffect(() => {
    if (!editor) return
    const onEditorEvent = () => {
      updateSlashMenu(editor)
      updateTableToolbar(editor)
    }
    editor.on('selectionUpdate', onEditorEvent)
    editor.on('update', onEditorEvent)
    // Also listen to raw DOM clicks so programmatic and real clicks both work
    const handleDomClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const tableEl = target?.closest?.('table') as HTMLElement | null
      const cellEl  = target?.closest?.('td, th') as HTMLElement | null
      if (tableEl) {
        const r = tableEl.getBoundingClientRect()
        setTableRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        if (cellEl) {
          activeCellRef.current = cellEl
          const cr = cellEl.getBoundingClientRect()
          // Y is always above the TABLE TOP, not the clicked cell
          setColHandle({ x: cr.left + cr.width / 2 - 12, y: r.top - 24 })
          setColMenu(null)
        }
      } else {
        setTableRect(null)
        setColHandle(null)
        setColMenu(null)
        setRowHandle(null)
      }
    }

    // Row handle + block handle: track hovered block/row
    const handleDomMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const rowEl   = target?.closest?.('tr') as HTMLElement | null
      const tableEl = target?.closest?.('table') as HTMLElement | null

      if (tableEl && rowEl) {
        // Inside table — row handle, no block handle
        if (activeRowRef.current !== rowEl) {
          activeRowRef.current = rowEl
          const tableR = tableEl.getBoundingClientRect()
          const rr = rowEl.getBoundingClientRect()
          setRowHandle({ x: tableR.left - 30, y: rr.top, height: rr.height })
        }
        if (blockHandlePosRef.current !== null) {
          blockHandlePosRef.current = null
          setBlockHandle(null)
        }
      } else {
        // Outside table — block handle, no row handle
        if (activeRowRef.current) { activeRowRef.current = null; setRowHandle(null) }

        try {
          const posResult = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
          if (!posResult) { blockHandlePosRef.current = null; setBlockHandle(null); return }
          const resolved = editor.state.doc.resolve(posResult.pos)
          if (resolved.depth < 1) { blockHandlePosRef.current = null; setBlockHandle(null); return }
          const blockPos = resolved.before(1)
          if (blockPos === blockHandlePosRef.current) return  // same block, skip re-render
          const blockNode = editor.state.doc.nodeAt(blockPos)
          if (!blockNode) { blockHandlePosRef.current = null; setBlockHandle(null); return }
          const domNode = editor.view.nodeDOM(blockPos) as HTMLElement | null
          if (!domNode) { blockHandlePosRef.current = null; setBlockHandle(null); return }
          const rect = domNode.getBoundingClientRect()
          if (rect.height === 0) { blockHandlePosRef.current = null; setBlockHandle(null); return }
          blockHandlePosRef.current = blockPos
          // Two 28px buttons + 4px gap = 60px; right edge flush with content left edge
          setBlockHandle({ x: rect.left - 64, y: rect.top, nodePos: blockPos, blockSize: blockNode.nodeSize })
        } catch {
          blockHandlePosRef.current = null
          setBlockHandle(null)
        }
      }
    }
    const handleDomMouseLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null
      if (!related?.closest?.('table') && !related?.closest?.('[data-row-handle]')) {
        setRowHandle(null); activeRowRef.current = null
      }
      if (
        !related?.closest?.('[data-block-handle]') &&
        !related?.closest?.('[data-block-menu]') &&
        !related?.closest?.('[data-block-picker]')
      ) {
        scheduleHideBlockHandle()
      }
    }

    editor.view.dom.addEventListener('click', handleDomClick)
    editor.view.dom.addEventListener('mousemove', handleDomMouseMove)
    editor.view.dom.addEventListener('mouseleave', handleDomMouseLeave)
    return () => {
      editor.off('selectionUpdate', onEditorEvent)
      editor.off('update', onEditorEvent)
      editor.view.dom.removeEventListener('click', handleDomClick)
      editor.view.dom.removeEventListener('mousemove', handleDomMouseMove)
      editor.view.dom.removeEventListener('mouseleave', handleDomMouseLeave)
    }
    // scheduleHideBlockHandle is stable (useCallback with empty deps); including it
    // would reattach DOM listeners unnecessarily on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, updateTableToolbar, updateSlashMenu])

  // Close menus when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as globalThis.Node)) {
        setMenu(null)
      }
      // Close col menu if click is outside editor area
      const target = e.target as HTMLElement
      if (
        !target.closest('.ProseMirror') &&
        !target.closest('[data-col-menu]') &&
        !target.closest('[data-col-handle]') &&
        !target.closest('[data-row-handle]')
      ) {
        setColMenu(null)
        setColSearch('')
        setColColorMenu(false)
      }
      // Close block menu/picker if click outside
      if (
        !target.closest('[data-block-menu]') &&
        !target.closest('[data-block-handle]') &&
        !target.closest('[data-block-picker]')
      ) {
        setBlockMenu(null)
        setBlockMenuSearch('')
        setBlockConvertMenu(false)
        setBlockPicker(null)
        setBlockPickerSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      <EditorContent editor={editor} />

      {/* Block handles — + and ⠿ appearing left of any hovered block */}
      {editor && blockHandle && (
        <BlockHandles
          editor={editor}
          blockHandle={blockHandle}
          blockMenu={blockMenu}
          blockPicker={blockPicker}
          setBlockMenu={setBlockMenu}
          setBlockMenuSearch={setBlockMenuSearch}
          setBlockConvertMenu={setBlockConvertMenu}
          setBlockPicker={setBlockPicker}
          setBlockPickerSearch={setBlockPickerSearch}
          cancelHideBlockHandle={cancelHideBlockHandle}
          scheduleHideBlockHandle={scheduleHideBlockHandle}
        />
      )}

      {/* ── Block type picker (from + button) ─────────────────────────────── */}
      {editor && blockPicker && (
        <BlockPicker
          blockPicker={blockPicker}
          blockPickerSearch={blockPickerSearch}
          setBlockPicker={setBlockPicker}
          setBlockPickerSearch={setBlockPickerSearch}
          applyBlockInsert={applyBlockInsert}
          cancelHideBlockHandle={cancelHideBlockHandle}
        />
      )}

      {/* ── Block context menu (from ⠿ button) ──────────────────────────────── */}
      {editor && blockMenu && (
        <BlockContextMenu
          editor={editor}
          blockMenu={blockMenu}
          blockMenuSearch={blockMenuSearch}
          blockConvertMenu={blockConvertMenu}
          setBlockMenu={setBlockMenu}
          setBlockMenuSearch={setBlockMenuSearch}
          setBlockConvertMenu={setBlockConvertMenu}
          applyBlockConvert={applyBlockConvert}
          cancelHideBlockHandle={cancelHideBlockHandle}
        />
      )}

      {/* Notion-style table controls: + add row (bottom) + add column (right) */}
      {editor && tableRect && (
        <TableOverlayButtons editor={editor} tableRect={tableRect} setTooltip={setTooltip} />
      )}

      {/* + Add row — left side of hovered row */}
      {editor && rowHandle && tableRect && (
        <RowHandle
          editor={editor}
          rowHandle={rowHandle}
          setRowHandle={setRowHandle}
          activeRowRef={activeRowRef}
          setTooltip={setTooltip}
        />
      )}

      {/* Column drag handle — appears at top-center of active cell */}
      {editor && colHandle && (
        <ColHandle
          colHandle={colHandle}
          activeCellRef={activeCellRef}
          setColMenu={setColMenu}
          setTooltip={setTooltip}
        />
      )}

      {/* Column context menu */}
      {editor && colMenu && (
        <ColumnContextMenu
          editor={editor}
          colMenu={colMenu}
          colSearch={colSearch}
          colColorMenu={colColorMenu}
          setColMenu={setColMenu}
          setColSearch={setColSearch}
          setColColorMenu={setColColorMenu}
        />
      )}

      {/* Notion-style custom tooltip */}
      <Tooltip tooltip={tooltip} />

      {/* Slash menu */}
      {menu && filteredItems.length > 0 && (
        <SlashMenu
          menu={menu}
          filteredItems={filteredItems}
          selectedIdx={selectedIdx}
          setSelectedIdx={setSelectedIdx}
          applyBlock={applyBlock}
          menuContainerRef={menuContainerRef}
        />
      )}
    </div>
  )
}
