import type { ReactNode } from 'react'
import type { Editor } from '@tiptap/core'
import { RefreshCw, Palette, Link2, Copy, FolderInput, Trash2, ChevronRight } from 'lucide-react'
import { SLASH_ITEMS, type SlashItemId } from './constants'
import type { BlockMenuState } from './BlockHandles'

interface BlockContextMenuProps {
  editor: Editor
  blockMenu: NonNullable<BlockMenuState>
  blockMenuSearch: string
  blockConvertMenu: boolean
  setBlockMenu: (v: BlockMenuState) => void
  setBlockMenuSearch: (v: string) => void
  setBlockConvertMenu: (v: boolean | ((prev: boolean) => boolean)) => void
  applyBlockConvert: (id: SlashItemId, nodePos: number) => void
  cancelHideBlockHandle: () => void
}

// ── Block context menu (from ⠿ button) ──────────────────────────────────────
export function BlockContextMenu({
  editor,
  blockMenu,
  blockMenuSearch,
  blockConvertMenu,
  setBlockMenu,
  setBlockMenuSearch,
  setBlockConvertMenu,
  applyBlockConvert,
  cancelHideBlockHandle,
}: BlockContextMenuProps) {
  const CONVERT_TYPES = SLASH_ITEMS.filter(i =>
    ['paragraph','h1','h2','h3','bulletList','orderedList','taskList','blockquote'].includes(i.id)
  )

  type BlockAction = { id: string; label: string; icon: ReactNode; shortcut?: string; danger?: boolean; hasSubmenu?: boolean; action: () => void }
  const BLOCK_ACTIONS: (BlockAction | null)[] = [
    {
      id: 'convert', label: 'Convertir en', icon: <RefreshCw size={13} />, hasSubmenu: true,
      action: () => setBlockConvertMenu(v => !v),
    },
    {
      id: 'color', label: 'Color', icon: <Palette size={13} />, hasSubmenu: true,
      action: () => {},
    },
    null,
    {
      id: 'copyLink', label: 'Copiar enlace del bloque', icon: <Link2 size={13} />, shortcut: '⌘^L',
      action: () => { setBlockMenu(null); setBlockMenuSearch('') },
    },
    {
      id: 'duplicate', label: 'Duplicar', icon: <Copy size={13} />, shortcut: '⌘D',
      action: () => {
        const node = editor.state.doc.nodeAt(blockMenu.nodePos)
        if (node) {
          const insertPos = blockMenu.nodePos + blockMenu.blockSize
          editor.chain().focus().insertContentAt(insertPos, node.toJSON()).run()
        }
        setBlockMenu(null); setBlockMenuSearch('')
      },
    },
    {
      id: 'moveTo', label: 'Mover a', icon: <FolderInput size={13} />, shortcut: '⌘⇧P',
      action: () => { setBlockMenu(null); setBlockMenuSearch('') },
    },
    {
      id: 'delete', label: 'Eliminar', icon: <Trash2 size={13} />, shortcut: 'Del', danger: true,
      action: () => {
        editor.chain().focus().deleteRange({ from: blockMenu.nodePos, to: blockMenu.nodePos + blockMenu.blockSize }).run()
        setBlockMenu(null); setBlockMenuSearch('')
      },
    },
  ]

  const q = blockMenuSearch.toLowerCase()
  const filteredActions = BLOCK_ACTIONS.filter(a => !a || !q || a.label.toLowerCase().includes(q))

  const MENU_W = 260
  const CONVERT_W = 220
  // Flip left if near right edge
  const left = blockMenu.x + MENU_W > window.innerWidth - 12
    ? blockMenu.x - MENU_W - 8
    : blockMenu.x

  return (
    <>
      {/* Convert submenu */}
      {blockConvertMenu && (
        <div
          data-block-menu
          className="fixed z-[63] rounded-xl shadow-2xl overflow-hidden select-none"
          style={{
            top: blockMenu.y,
            left: left - CONVERT_W - 4,
            width: CONVERT_W,
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
            Convertir en
          </div>
          <div className="pb-2">
            {CONVERT_TYPES.map(ct => (
              <button
                key={ct.id}
                onMouseDown={(e) => { e.preventDefault(); applyBlockConvert(ct.id, blockMenu.nodePos) }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left"
                style={{ color: 'var(--foreground)', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="w-5 text-center text-[11px] font-mono flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>{ct.icon}</span>
                <span className="flex-1">{ct.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main block menu */}
      <div
        data-block-menu
        className="fixed z-[62] rounded-xl shadow-2xl overflow-hidden select-none"
        style={{
          top: blockMenu.y,
          left,
          width: MENU_W,
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
        }}
        onMouseEnter={cancelHideBlockHandle}
      >
        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <input
            autoFocus
            value={blockMenuSearch}
            onChange={e => setBlockMenuSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setBlockMenu(null); setBlockMenuSearch(''); setBlockConvertMenu(false) } }}
            placeholder="Buscar acciones..."
            className="w-full text-xs bg-transparent outline-none rounded-md px-2.5 py-1.5"
            style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2383E2')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
        {/* Actions */}
        <div className="pb-2">
          {filteredActions.map((item, i) =>
            !item ? (
              <div key={i} style={{ height: 1, backgroundColor: 'var(--border)', margin: '4px 8px' }} />
            ) : (
              <button
                key={item.id}
                onMouseDown={(e) => { e.preventDefault(); item.action() }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left"
                style={{
                  color: item.danger ? '#E05252' : 'var(--foreground)',
                  backgroundColor: (item.id === 'convert' && blockConvertMenu) ? 'var(--muted)' : 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = (item.id === 'convert' && blockConvertMenu) ? 'var(--muted)' : 'transparent')}
              >
                <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 16, color: item.danger ? '#E05252' : 'var(--muted-foreground)' }}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--muted-foreground)' }}>{item.shortcut}</span>
                )}
                {item.hasSubmenu && <ChevronRight size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />}
              </button>
            )
          )}
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 0 4px' }} />
        <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          Última edición por ti
        </div>
      </div>
    </>
  )
}
