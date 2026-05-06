import { SLASH_ITEMS, type SlashItemId } from './constants'
import type { BlockPickerState } from './BlockHandles'

interface BlockPickerProps {
  blockPicker: NonNullable<BlockPickerState>
  blockPickerSearch: string
  setBlockPicker: (v: BlockPickerState) => void
  setBlockPickerSearch: (v: string) => void
  applyBlockInsert: (id: SlashItemId, insertPos: number) => void
  cancelHideBlockHandle: () => void
}

// ── Block type picker (from + button) ───────────────────────────────────────
export function BlockPicker({
  blockPicker,
  blockPickerSearch,
  setBlockPicker,
  setBlockPickerSearch,
  applyBlockInsert,
  cancelHideBlockHandle,
}: BlockPickerProps) {
  const PICKER_SECTIONS = [
    {
      title: 'Bloques básicos',
      items: SLASH_ITEMS.filter(i =>
        ['paragraph','h1','h2','h3','bulletList','orderedList','taskList','blockquote','details','table','hr'].includes(i.id)
      ),
    },
  ]
  const q = blockPickerSearch.toLowerCase()
  const filtered = PICKER_SECTIONS.map(s => ({
    ...s,
    items: q ? s.items.filter(i => i.label.toLowerCase().includes(q)) : s.items,
  })).filter(s => s.items.length > 0)

  return (
    <div
      data-block-picker
      className="fixed z-[62] rounded-xl shadow-2xl overflow-hidden select-none"
      style={{
        top: blockPicker.y,
        left: blockPicker.x,
        width: 240,
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={cancelHideBlockHandle}
    >
      <div className="max-h-[300px] overflow-y-auto p-1">
        {filtered.map(section => (
          <div key={section.title}>
            <div
              className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {section.title}
            </div>
            {section.items.map((item) => (
              <div
                key={item.id}
                role="button"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-sm"
                style={{ color: 'var(--foreground)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                onMouseDown={(e) => {
                  e.preventDefault()
                  applyBlockInsert(item.id, blockPicker.insertPos)
                }}
              >
                <span className="w-5 text-center text-[11px] flex-shrink-0 font-mono" style={{ color: 'var(--muted-foreground)' }}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--muted-foreground)' }}>{item.shortcut}</span>
                )}
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-3 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
            Sin resultados
          </div>
        )}
      </div>
      <div style={{ height: 1, backgroundColor: 'var(--border)' }} />
      <div className="px-3 py-2">
        <input
          autoFocus
          value={blockPickerSearch}
          onChange={e => setBlockPickerSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setBlockPicker(null); setBlockPickerSearch('') } }}
          placeholder="Escribe para filtrar..."
          className="w-full text-xs bg-transparent outline-none"
          style={{ color: 'var(--foreground)' }}
        />
      </div>
      <div
        className="px-3 py-1.5 border-t text-[11px] flex justify-between"
        style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
      >
        <span>Cerrar menú</span><span>esc</span>
      </div>
    </div>
  )
}
