import type { RefObject } from 'react'
import { SLASH_ITEMS, type MenuState, type SlashItemId } from './constants'

interface SlashMenuProps {
  menu: NonNullable<MenuState>
  filteredItems: (typeof SLASH_ITEMS)[number][]
  selectedIdx: number
  setSelectedIdx: (i: number) => void
  applyBlock: (id: SlashItemId) => void
  menuContainerRef: RefObject<HTMLDivElement | null>
}

// Slash menu
export function SlashMenu({ menu, filteredItems, selectedIdx, setSelectedIdx, applyBlock, menuContainerRef }: SlashMenuProps) {
  if (filteredItems.length === 0) return null
  return (
    <div
      ref={menuContainerRef}
      className="fixed z-[60] w-[240px] overflow-hidden rounded-lg shadow-xl"
      style={{
        top: menu.y,
        left: menu.x,
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <ul className="max-h-[280px] overflow-y-auto p-1 m-0 list-none">
        {filteredItems.map((item, i) => (
          <li
            key={item.id}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-sm select-none"
            style={{
              backgroundColor: i === selectedIdx ? 'var(--muted)' : 'transparent',
              color: 'var(--foreground)',
            }}
            onMouseEnter={() => setSelectedIdx(i)}
            onMouseDown={(e) => {
              e.preventDefault() // keep editor focused
              applyBlock(item.id)
            }}
          >
            <span
              className="w-5 text-center text-[11px] flex-shrink-0 font-mono"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span
                className="text-[11px] tabular-nums"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {item.shortcut}
              </span>
            )}
          </li>
        ))}
      </ul>
      <div
        className="px-3 py-2 border-t text-[11px] flex justify-between"
        style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
      >
        <span>Cerrar menú</span>
        <span>esc</span>
      </div>
    </div>
  )
}
