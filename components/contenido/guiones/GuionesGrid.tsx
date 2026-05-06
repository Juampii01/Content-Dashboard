'use client'


import { Plus, Trash2, MoreHorizontal, X, FileText, ChevronDown, ChevronRight, Smile, XCircle } from 'lucide-react'
import type { GuionTab, GuionItem } from '@/lib/types'

const TAB_COLORS = ['var(--accent)', '#B08A4A', '#5C4B50', '#7A6060', '#C49A6C', '#2A4A6C', '#4A6C2A', '#6C2A5C']

function getTabColor(idx: number) {
  return TAB_COLORS[idx % TAB_COLORS.length]
}

interface GuionesGridProps {
  tabs: GuionTab[]
  items: GuionItem[]
  activeItemId: string | null
  expandedTabId: string | null
  menuTabId: string | null
  renamingTabId: string | null
  renameVal: string
  renamingItemId: string | null
  renameItemVal: string
  menuRef: React.RefObject<HTMLDivElement | null>
  onAddTab: () => void
  onDeleteTab: (tabId: string) => void
  onSetExpandedTab: (tabId: string | null) => void
  onOpenEmojiPicker: (tabId: string, anchor: { top: number; left: number }) => void
  onToggleMenu: (tabId: string) => void
  onClearTabEmoji: (tabId: string) => void
  onStartRenameTab: (tabId: string, currentName: string) => void
  onRenameValChange: (val: string) => void
  onFinishRenameTab: (tabId: string) => void
  onCancelRenameTab: () => void
  onSelectItem: (itemId: string) => void
  onStartRenameItem: (itemId: string, currentTitle: string) => void
  onRenameItemValChange: (val: string) => void
  onFinishRenameItem: (itemId: string) => void
  onCancelRenameItem: () => void
  onDeleteItem: (itemId: string) => void
  onAddItem: (tabId: string) => void
}

export function GuionesGrid({
  tabs, items, activeItemId, expandedTabId,
  menuTabId, renamingTabId, renameVal,
  renamingItemId, renameItemVal,
  menuRef,
  onAddTab, onDeleteTab, onSetExpandedTab,
  onOpenEmojiPicker, onToggleMenu, onClearTabEmoji,
  onStartRenameTab, onRenameValChange, onFinishRenameTab, onCancelRenameTab,
  onSelectItem, onStartRenameItem, onRenameItemValChange,
  onFinishRenameItem, onCancelRenameItem, onDeleteItem, onAddItem,
}: GuionesGridProps) {
  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          Pestañas del documento
        </span>
        <button
          onClick={onAddTab}
          className="w-6 h-6 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
          style={{ color: 'var(--muted-foreground)' }}
          title="Nueva pestaña"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {tabs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 px-4">
            <FileText size={18} style={{ color: 'var(--muted-foreground)', opacity: 0.3 }} />
            <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>
              Crea una pestaña con el botón +
            </p>
          </div>
        )}

        {tabs.map((tab, tabIdx) => {
          const tabItems = items.filter(i => i.tabId === tab.id)
          const isExpanded = expandedTabId === tab.id
          const tabColor = getTabColor(tabIdx)

          return (
            <div key={tab.id}>
              <div
                className="group relative flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: isExpanded ? tabColor + '15' : 'transparent' }}
                onClick={() => onSetExpandedTab(isExpanded ? null : tab.id)}
              >
                <span style={{ color: 'var(--muted-foreground)', opacity: 0.5, flexShrink: 0 }}>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>

                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-sm cursor-pointer hover:opacity-70 transition-opacity"
                  style={tab.emoji ? {} : { backgroundColor: tabColor }}
                  title="Cambiar emoji"
                  onClick={e => {
                    e.stopPropagation()
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    onOpenEmojiPicker(tab.id, { top: rect.bottom + 6, left: rect.left })
                  }}
                >
                  {tab.emoji || ''}
                </span>

                {renamingTabId === tab.id ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={e => onRenameValChange(e.target.value)}
                    onBlur={() => onFinishRenameTab(tab.id)}
                    onKeyDown={e => {
                      e.stopPropagation()
                      if (e.key === 'Enter') onFinishRenameTab(tab.id)
                      if (e.key === 'Escape') onCancelRenameTab()
                    }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 text-sm font-medium bg-transparent outline-none border-b"
                    style={{ color: 'var(--foreground)', borderColor: tabColor, minWidth: 0 }}
                  />
                ) : (
                  <span
                    className="flex-1 text-sm font-medium truncate"
                    style={{ color: 'var(--foreground)' }}
                    onDoubleClick={e => {
                      e.stopPropagation()
                      onStartRenameTab(tab.id, tab.name)
                    }}
                  >
                    {tab.name}
                  </span>
                )}

                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:opacity-70"
                  style={{ color: 'var(--muted-foreground)' }}
                  onClick={e => {
                    e.stopPropagation()
                    onToggleMenu(tab.id)
                  }}
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>

              {menuTabId === tab.id && (
                <div
                  ref={menuRef}
                  className="absolute z-50 rounded-xl shadow-xl overflow-hidden"
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    minWidth: '170px',
                    marginLeft: '48px',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--foreground)' }}
                    onClick={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      onOpenEmojiPicker(tab.id, { top: rect.bottom + 4, left: rect.left })
                    }}
                  >
                    <Smile size={13} style={{ color: '#B08A4A' }} />
                    Seleccionar emoji
                  </button>
                  <button
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--foreground)' }}
                    onClick={() => onClearTabEmoji(tab.id)}
                  >
                    <XCircle size={13} style={{ color: 'var(--muted-foreground)' }} />
                    Borrar emoji
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)' }} />
                  <button
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--accent)' }}
                    onClick={() => onDeleteTab(tab.id)}
                  >
                    <Trash2 size={13} />
                    Eliminar pestaña
                  </button>
                </div>
              )}

              {isExpanded && (
                <div className="pl-8 pb-1">
                  {tabItems.map(item => {
                    const isActive = item.id === activeItemId
                    const isRenamingItem = renamingItemId === item.id
                    return (
                      <div key={item.id} className="group/item relative flex items-center">
                        {isRenamingItem ? (
                          <input
                            autoFocus
                            value={renameItemVal}
                            onChange={e => onRenameItemValChange(e.target.value)}
                            onBlur={() => onFinishRenameItem(item.id)}
                            onKeyDown={e => {
                              e.stopPropagation()
                              if (e.key === 'Enter') onFinishRenameItem(item.id)
                              if (e.key === 'Escape') onCancelRenameItem()
                            }}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 px-3 py-1.5 pr-7 text-sm bg-transparent outline-none border-b"
                            style={{ color: 'var(--foreground)', borderColor: tabColor, minWidth: 0 }}
                          />
                        ) : (
                          <button
                            onClick={() => onSelectItem(item.id)}
                            onDoubleClick={e => {
                              e.stopPropagation()
                              onStartRenameItem(item.id, item.title || '')
                            }}
                            className="flex-1 text-left px-3 py-1.5 pr-7 text-sm truncate rounded-lg transition-all hover:opacity-80"
                            style={{
                              backgroundColor: isActive ? tabColor + '20' : 'transparent',
                              color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                              fontWeight: isActive ? 500 : 400,
                            }}
                          >
                            {item.title || 'Sin título'}
                          </button>
                        )}
                        {!isRenamingItem && (
                          <button
                            onClick={e => { e.stopPropagation(); onDeleteItem(item.id) }}
                            className="absolute right-1 opacity-0 group-hover/item:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded-full"
                            style={{ backgroundColor: '#2A1C1F', color: 'var(--accent)' }}
                            title="Eliminar guión"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    )
                  })}

                  <button
                    onClick={e => { e.stopPropagation(); onAddItem(tab.id) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg w-full text-left hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <Plus size={11} /> Nuevo guión
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
