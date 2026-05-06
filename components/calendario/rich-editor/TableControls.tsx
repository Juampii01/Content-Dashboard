import type { RefObject } from 'react'
import type { Editor } from '@tiptap/core'
import type { ReactNode } from 'react'
import { Palette, ArrowLeft, ArrowRight, Copy, X, Trash2, ChevronRight } from 'lucide-react'
import { TEXT_COLORS, BG_COLORS } from './constants'
import type { TooltipState } from './Tooltip'

export type TableRect = { top: number; left: number; width: number; height: number } | null
export type ColHandleState = { x: number; y: number } | null
export type ColMenuState = { x: number; y: number } | null
export type RowHandleState = { x: number; y: number; height: number } | null

interface TableOverlayButtonsProps {
  editor: Editor
  tableRect: NonNullable<TableRect>
  setTooltip: (v: TooltipState) => void
}

// Notion-style table controls: + add row (bottom) + add column (right)
export function TableOverlayButtons({ editor, tableRect, setTooltip }: TableOverlayButtonsProps) {
  return (
    <>
      {/* + Add row — full-width bar below table */}
      <button
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run() }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1'
          const r = e.currentTarget.getBoundingClientRect()
          setTooltip({
            x: r.left + r.width / 2,
            y: r.top - 8,
            lines: [
              { bold: 'Haz clic', rest: ' para añadir una nueva fila' },
              { bold: 'Arrastra', rest: ' para añadir o eliminar filas' },
            ],
          })
        }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; setTooltip(null) }}
        className="fixed z-[55] flex items-center justify-center text-sm select-none"
        style={{
          top: tableRect.top + tableRect.height + 1,
          left: tableRect.left,
          width: tableRect.width,
          height: 28,
          borderRadius: '0 0 4px 4px',
          backgroundColor: 'var(--muted)',
          color: 'var(--muted-foreground)',
          opacity: 0.7,
        }}
      >
        +
      </button>

      {/* + Add column — vertical bar to the right of table */}
      <button
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run() }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1'
          const r = e.currentTarget.getBoundingClientRect()
          setTooltip({
            x: r.left - 6,
            y: r.top + r.height / 2,
            placement: 'left',
            lines: [
              { bold: 'Haz clic', rest: ' para añadir una nueva columna' },
              { bold: 'Arrastra', rest: ' para añadir o eliminar columnas' },
            ],
          })
        }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; setTooltip(null) }}
        className="fixed z-[55] flex items-center justify-center text-sm select-none"
        style={{
          top: tableRect.top,
          left: tableRect.left + tableRect.width + 1,
          width: 28,
          height: tableRect.height,
          borderRadius: '0 4px 4px 0',
          backgroundColor: 'var(--muted)',
          color: 'var(--muted-foreground)',
          opacity: 0.7,
        }}
      >
        +
      </button>
    </>
  )
}

interface RowHandleProps {
  editor: Editor
  rowHandle: NonNullable<RowHandleState>
  setRowHandle: (v: RowHandleState) => void
  activeRowRef: RefObject<HTMLElement | null>
  setTooltip: (v: TooltipState) => void
}

// + Add row — left side of hovered row
export function RowHandle({ editor, rowHandle, setRowHandle, activeRowRef, setTooltip }: RowHandleProps) {
  return (
    <button
      data-row-handle
      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run() }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1'
        const r = e.currentTarget.getBoundingClientRect()
        setTooltip({
          x: r.right + 6,
          y: r.top + r.height / 2,
          placement: 'right',
          lines: [
            { bold: 'Haz clic', rest: ' para añadir debajo' },
            { bold: 'Presiona ⌥', rest: ' y haz clic para añadir arriba' },
          ],
        })
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.7'
        setTooltip(null)
        // If mouse moved back into table, restore row tracking
        const related = e.relatedTarget as HTMLElement | null
        if (!related?.closest?.('table')) {
          setRowHandle(null)
          activeRowRef.current = null
        }
      }}
      className="fixed z-[55] flex items-center justify-center text-xs select-none"
      style={{
        top: rowHandle.y,
        left: rowHandle.x,
        width: 24,
        height: rowHandle.height,
        borderRadius: '4px 0 0 4px',
        backgroundColor: 'var(--muted)',
        color: 'var(--muted-foreground)',
        opacity: 0.7,
      }}
    >
      +
    </button>
  )
}

interface ColHandleProps {
  colHandle: NonNullable<ColHandleState>
  activeCellRef: RefObject<HTMLElement | null>
  setColMenu: (v: ColMenuState) => void
  setTooltip: (v: TooltipState) => void
}

// Column drag handle — appears at top-center of active cell
export function ColHandle({ colHandle, activeCellRef, setColMenu, setTooltip }: ColHandleProps) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        const cell = activeCellRef.current
        const rect = cell?.getBoundingClientRect()
        if (rect) setColMenu({ x: rect.left + rect.width - 4, y: rect.top - 2 })
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1'
        const r = e.currentTarget.getBoundingClientRect()
        setTooltip({
          x: r.left + r.width / 2,
          y: r.bottom + 6,
          placement: 'bottom',
          lines: [
            { bold: 'Arrastra', rest: ' para mover' },
            { bold: 'Haz clic', rest: ' o pulsa ⌘/ para abrir el menú.' },
          ],
        })
      }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; setTooltip(null) }}
      data-col-handle
      className="fixed z-[56] flex items-center justify-center rounded select-none"
      style={{
        top: colHandle.y,
        left: colHandle.x,
        width: 24,
        height: 18,
        backgroundColor: 'var(--muted)',
        border: '1px solid var(--border)',
        color: 'var(--muted-foreground)',
        fontSize: 10,
        letterSpacing: '1px',
        opacity: 0.8,
      }}
    >
      ⠿
    </button>
  )
}

interface ColumnContextMenuProps {
  editor: Editor
  colMenu: NonNullable<ColMenuState>
  colSearch: string
  colColorMenu: boolean
  setColMenu: (v: ColMenuState) => void
  setColSearch: (v: string) => void
  setColColorMenu: (v: boolean | ((prev: boolean) => boolean)) => void
}

// Column context menu
export function ColumnContextMenu({
  editor,
  colMenu,
  colSearch,
  colColorMenu,
  setColMenu,
  setColSearch,
  setColColorMenu,
}: ColumnContextMenuProps) {
  type Action = {
    id: string; label: string; icon: ReactNode
    shortcut?: string; danger?: boolean; hasSubmenu?: boolean
    action: () => void
  }
  const COL_ACTIONS: (Action | null)[] = [
    { id: 'color',       label: 'Color',                   icon: <Palette size={14} />,    hasSubmenu: true,  action: () => setColColorMenu(v => !v) },
    { id: 'insertLeft',  label: 'Insertar a la izquierda', icon: <ArrowLeft size={14} />,              action: () => { editor.chain().focus().addColumnBefore().run(); setColMenu(null); setColSearch('') } },
    { id: 'insertRight', label: 'Insertar a la derecha',   icon: <ArrowRight size={14} />,             action: () => { editor.chain().focus().addColumnAfter().run();  setColMenu(null); setColSearch('') } },
    { id: 'duplicate',   label: 'Duplicar',                icon: <Copy size={14} />,       shortcut: '⌘D', action: () => {} },
    null,
    { id: 'clear',       label: 'Borrar contenidos',       icon: <X size={14} />,                      action: () => { setColMenu(null); setColSearch('') } },
    { id: 'delete',      label: 'Eliminar',                icon: <Trash2 size={14} />,     danger: true,  action: () => { editor.chain().focus().deleteColumn().run(); setColMenu(null); setColSearch('') } },
  ]
  const q = colSearch.toLowerCase()
  const filtered = COL_ACTIONS.filter(a => !a || !q || a.label.toLowerCase().includes(q))

  const MENU_W = 240
  const COLOR_W = 220

  return (
    <>
      {/* Color submenu — to the LEFT of main menu */}
      {colColorMenu && (
        <div
          data-col-menu
          className="fixed z-[63] rounded-xl shadow-2xl overflow-hidden select-none"
          style={{
            top: colMenu.y,
            left: colMenu.x - COLOR_W - 6,
            width: COLOR_W,
            maxHeight: 420,
            overflowY: 'auto',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Text colors */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted-foreground)' }}>
              Color del texto
            </p>
            {TEXT_COLORS.map(c => (
              <button
                key={c.label}
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (c.value) {
                    editor.chain().focus().setColor(c.value).run()
                  } else {
                    editor.chain().focus().unsetColor().run()
                  }
                  setColColorMenu(false)
                }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-left"
                style={{ color: 'var(--foreground)', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded-sm text-[11px] font-bold"
                  style={{
                    width: 20, height: 20,
                    color: c.value || 'var(--foreground)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                  }}
                >
                  A
                </span>
                <span className="text-xs">Texto {c.label.toLowerCase()}</span>
              </button>
            ))}
          </div>
          <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '6px 0' }} />
          {/* Background colors */}
          <div className="px-3 pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted-foreground)' }}>
              Color del fondo
            </p>
            {BG_COLORS.map(c => (
              <button
                key={c.label}
                onMouseDown={(e) => {
                  e.preventDefault()
                  editor.chain().focus().setCellAttribute('backgroundColor', c.value || null).run()
                  setColColorMenu(false)
                }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-left"
                style={{ color: 'var(--foreground)', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span
                  className="flex-shrink-0 rounded-sm"
                  style={{
                    width: 20, height: 20,
                    backgroundColor: c.dot,
                    border: `1px solid ${c.border ?? 'var(--border)'}`,
                  }}
                />
                <span className="text-xs">Fondo {c.label.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main column menu */}
      <div
        data-col-menu
        className="fixed z-[62] rounded-xl shadow-2xl overflow-hidden select-none"
        style={{
          top: colMenu.y,
          left: colMenu.x,
          width: MENU_W,
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <input
            autoFocus
            value={colSearch}
            onChange={e => { setColSearch(e.target.value); setColColorMenu(false) }}
            placeholder="Buscar acciones..."
            className="w-full text-xs bg-transparent outline-none rounded-md px-2.5 py-1.5"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2383E2')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
        {/* Actions */}
        <div className="pb-2">
          {filtered.map((item, i) =>
            !item ? (
              <div key={i} style={{ height: 1, backgroundColor: 'var(--border)', margin: '4px 8px' }} />
            ) : (
              <button
                key={item.id}
                onMouseDown={(e) => {
                  e.preventDefault()
                  item.action()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left"
                style={{
                  color: item.danger ? '#E05252' : 'var(--foreground)',
                  backgroundColor: item.id === 'color' && colColorMenu ? 'var(--muted)' : 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = item.id === 'color' && colColorMenu ? 'var(--muted)' : 'transparent')}
              >
                <span
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: 16, color: item.danger ? '#E05252' : 'var(--muted-foreground)' }}
                >
                  {item.icon}
                </span>
                <span className="flex-1 text-sm">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                    {item.shortcut}
                  </span>
                )}
                {item.hasSubmenu && (
                  <ChevronRight size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                )}
              </button>
            )
          )}
        </div>
      </div>
    </>
  )
}
