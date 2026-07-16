'use client'

import {
  Plus, Trash2, MoreHorizontal, X, FileText,
  ChevronRight, Smile, XCircle, FolderOpen, Folder, GripVertical,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { GuionTab, GuionItem } from '@/lib/types'

const TAB_COLORS = [
  'var(--accent)',
  '#B08A4A',
  '#5C6BC0',
  '#26A69A',
  '#EF5350',
  '#42A5F5',
  '#66BB6A',
  '#AB47BC',
]

function getTabColor(idx: number) {
  return TAB_COLORS[idx % TAB_COLORS.length]
}

// ─── Sortable render-prop helper ──────────────────────────────────────────────
// Keeps the row markup inline (closure over map vars) while satisfying the
// rules-of-hooks: the useSortable hook lives in this stable, module-level
// component. `attributes`/`listeners` must be spread onto the drag handle only.

// Types derived straight from the hook so we never restate dnd-kit internals.
type SortableState = ReturnType<typeof useSortable>

interface SortableRenderProps {
  setNodeRef: SortableState['setNodeRef']
  style: React.CSSProperties
  attributes: SortableState['attributes']
  listeners: SortableState['listeners']
  isDragging: boolean
}

function Sortable({
  id,
  children,
}: {
  id: string
  children: (p: SortableRenderProps) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : undefined,
  }
  return <>{children({ setNodeRef, style, attributes, listeners, isDragging })}</>
}

// Small grip handle shared by folders and scripts.
function DragGrip({
  attributes,
  listeners,
  className,
  color,
}: {
  attributes: SortableState['attributes']
  listeners: SortableState['listeners']
  className: string
  color: string
}) {
  return (
    <button
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
      title="Arrastrar para reordenar"
      className={`opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex items-center justify-center cursor-grab active:cursor-grabbing ${className}`}
      style={{ color, touchAction: 'none' }}
    >
      <GripVertical size={12} />
    </button>
  )
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
  onReorderTabs: (orderedIds: string[]) => void
  onReorderItems: (tabId: string, orderedIds: string[]) => void
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
  onReorderTabs, onReorderItems,
}: GuionesGridProps) {
  const totalItems = items.length

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    // ── Reorder folders (tabs) ──
    if (activeId.startsWith('tab:') && overId.startsWith('tab:')) {
      const ids = tabs.map((t) => t.id)
      const from = ids.indexOf(activeId.slice(4))
      const to = ids.indexOf(overId.slice(4))
      if (from < 0 || to < 0) return
      onReorderTabs(arrayMove(ids, from, to))
      return
    }

    // ── Reorder scripts (items) within the same folder ──
    if (activeId.startsWith('item:') && overId.startsWith('item:')) {
      const aId = activeId.slice(5)
      const oId = overId.slice(5)
      const aItem = items.find((i) => i.id === aId)
      const oItem = items.find((i) => i.id === oId)
      if (!aItem || !oItem || aItem.tabId !== oItem.tabId) return
      const ids = items.filter((i) => i.tabId === aItem.tabId).map((i) => i.id)
      const from = ids.indexOf(aId)
      const to = ids.indexOf(oId)
      if (from < 0 || to < 0) return
      onReorderItems(aItem.tabId, arrayMove(ids, from, to))
    }
  }

  return (
    <div
      className="w-full md:w-72 flex-shrink-0 flex flex-col max-h-[42vh] md:max-h-none"
      style={{
        borderRight: '1px solid var(--border)',
        backgroundColor: 'color-mix(in srgb, var(--foreground) 1.5%, var(--card))',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Biblioteca
          </span>
          {totalItems > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
              }}
            >
              {totalItems}
            </span>
          )}
        </div>
        <button
          onClick={onAddTab}
          title="Nueva carpeta"
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95"
          style={{
            color: 'var(--muted-foreground)',
            backgroundColor: 'color-mix(in srgb, var(--foreground) 5%, transparent)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent-foreground)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 5%, transparent)'
            e.currentTarget.style.color = 'var(--muted-foreground)'
          }}
        >
          <Plus size={15} />
        </button>
      </div>

      {/* ── Tree ── */}
      <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
        {tabs.length === 0 ? (
          /* ─ Empty state ─ */
          <div className="flex flex-col items-center justify-center gap-5 px-6 py-14 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent)',
              }}
            >
              <FolderOpen size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Sin carpetas todavía
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                Organizá tus guiones en carpetas para mantener todo a mano.
              </p>
            </div>
            <button
              onClick={onAddTab}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer active:scale-[0.98]"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-foreground)',
                boxShadow: 'var(--shadow-card-sm)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              <Plus size={15} />
              Nueva carpeta
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map((t) => `tab:${t.id}`)} strategy={verticalListSortingStrategy}>
          {tabs.map((tab, tabIdx) => {
            const tabItems   = items.filter((i) => i.tabId === tab.id)
            const isExpanded = expandedTabId === tab.id
            const tabColor   = getTabColor(tabIdx)

            return (
              <Sortable key={tab.id} id={`tab:${tab.id}`}>
              {({ setNodeRef, style, attributes, listeners }) => (
              <div ref={setNodeRef} style={style} className="relative">

                {/* ─ Folder row ─ */}
                <div
                  className="group relative flex items-center gap-2.5 mx-2 px-2.5 py-2.5 rounded-xl cursor-pointer select-none transition-all"
                  style={{
                    backgroundColor: isExpanded
                      ? `color-mix(in srgb, ${tabColor} 11%, transparent)`
                      : 'transparent',
                  }}
                  onClick={() => onSetExpandedTab(isExpanded ? null : tab.id)}
                  onMouseEnter={(e) => {
                    if (!isExpanded)
                      e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${tabColor} 6%, transparent)`
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded)
                      e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {/* Drag handle (in the left gutter) */}
                  {renamingTabId !== tab.id && (
                    <DragGrip
                      attributes={attributes}
                      listeners={listeners}
                      color={tabColor}
                      className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-4 h-6 rounded"
                    />
                  )}

                  {/* Left accent stripe when expanded */}
                  {isExpanded && (
                    <div
                      className="absolute -left-px top-2 bottom-2 w-[3px] rounded-full"
                      style={{ backgroundColor: tabColor }}
                    />
                  )}

                  {/* Folder icon / emoji */}
                  <span
                    className="w-7 h-7 flex items-center justify-center flex-shrink-0 text-base leading-none rounded-lg cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      background: isExpanded
                        ? `color-mix(in srgb, ${tabColor} 20%, transparent)`
                        : `color-mix(in srgb, ${tabColor} 11%, transparent)`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      onOpenEmojiPicker(tab.id, { top: rect.bottom + 6, left: rect.left })
                    }}
                    title="Cambiar emoji"
                  >
                    {tab.emoji
                      ? <span className="text-base">{tab.emoji}</span>
                      : isExpanded
                      ? <FolderOpen size={14} style={{ color: tabColor }} />
                      : <Folder size={14} style={{ color: tabColor }} />
                    }
                  </span>

                  {/* Name */}
                  {renamingTabId === tab.id ? (
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={(e) => onRenameValChange(e.target.value)}
                      onBlur={() => onFinishRenameTab(tab.id)}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter') onFinishRenameTab(tab.id)
                        if (e.key === 'Escape') onCancelRenameTab()
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-xs font-medium bg-transparent outline-none px-1 py-0.5 rounded"
                      style={{
                        color: 'var(--foreground)',
                        border: `1px solid ${tabColor}`,
                        minWidth: 0,
                      }}
                    />
                  ) : (
                    <span
                      className="flex-1 text-[13px] font-semibold truncate"
                      style={{ color: isExpanded ? 'var(--foreground)' : 'color-mix(in srgb, var(--foreground) 82%, transparent)' }}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        onStartRenameTab(tab.id, tab.name)
                      }}
                    >
                      {tab.name}
                    </span>
                  )}

                  {/* Count badge */}
                  {tabItems.length > 0 && renamingTabId !== tab.id && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums transition-opacity"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${tabColor} 12%, transparent)`,
                        color: tabColor,
                        opacity: isExpanded ? 1 : 0.7,
                      }}
                    >
                      {tabItems.length}
                    </span>
                  )}

                  {/* Chevron */}
                  {renamingTabId !== tab.id && (
                    <span
                      className="flex-shrink-0 transition-all duration-200 opacity-0 group-hover:opacity-50"
                      style={{
                        color: tabColor,
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      <ChevronRight size={12} />
                    </span>
                  )}

                  {/* More button */}
                  {renamingTabId !== tab.id && (
                    <button
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md cursor-pointer"
                      style={{ color: 'var(--muted-foreground)' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleMenu(tab.id)
                      }}
                    >
                      <MoreHorizontal size={12} />
                    </button>
                  )}
                </div>

                {/* ─ Context menu ─ */}
                {menuTabId === tab.id && (
                  <div
                    ref={menuRef}
                    className="absolute z-50 rounded-xl shadow-xl overflow-hidden py-1"
                    style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      minWidth: '180px',
                      left: '52px',
                      top: '100%',
                      marginTop: '2px',
                      boxShadow: 'var(--shadow-modal)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-left transition-colors cursor-pointer"
                      style={{ color: 'var(--foreground)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 5%, transparent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        onOpenEmojiPicker(tab.id, { top: rect.bottom + 4, left: rect.left })
                      }}
                    >
                      <Smile size={12} style={{ color: '#B08A4A', flexShrink: 0 }} />
                      Cambiar emoji
                    </button>
                    <button
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-left transition-colors cursor-pointer"
                      style={{ color: 'var(--foreground)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 5%, transparent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      onClick={() => onClearTabEmoji(tab.id)}
                    >
                      <XCircle size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                      Quitar emoji
                    </button>
                    <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 8px' }} />
                    <button
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-left transition-colors cursor-pointer"
                      style={{ color: 'var(--destructive, #ef4444)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--destructive, #ef4444) 8%, transparent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      onClick={() => onDeleteTab(tab.id)}
                    >
                      <Trash2 size={12} style={{ flexShrink: 0 }} />
                      Eliminar carpeta
                    </button>
                  </div>
                )}

                {/* ─ Expanded items ─ */}
                {isExpanded && (
                  <div className="mx-1.5 mb-1">
                    <div
                      className="relative ml-3.5 pl-3.5"
                      style={{ borderLeft: `2px solid color-mix(in srgb, ${tabColor} 22%, transparent)` }}
                    >
                      {tabItems.length === 0 && (
                        <p
                          className="py-2 text-[11px] italic"
                          style={{ color: 'var(--muted-foreground)', opacity: 0.35 }}
                        >
                          Sin guiones aún
                        </p>
                      )}

                      <SortableContext items={tabItems.map((i) => `item:${i.id}`)} strategy={verticalListSortingStrategy}>
                      {tabItems.map((item) => {
                        const isActive      = item.id === activeItemId
                        const isRenamingItem = renamingItemId === item.id

                        return (
                          <Sortable key={item.id} id={`item:${item.id}`}>
                          {({ setNodeRef: setItemRef, style: itemStyle, attributes: itemAttrs, listeners: itemListeners }) => (
                          <div
                            ref={setItemRef}
                            style={itemStyle}
                            className="group/item relative flex items-center mb-0.5"
                          >
                            {!isRenamingItem && (
                              <DragGrip
                                attributes={itemAttrs}
                                listeners={itemListeners}
                                color={tabColor}
                                className="absolute -left-[13px] top-1/2 -translate-y-1/2 w-3.5 h-5"
                              />
                            )}
                            {isRenamingItem ? (
                              <input
                                autoFocus
                                value={renameItemVal}
                                onChange={(e) => onRenameItemValChange(e.target.value)}
                                onBlur={() => onFinishRenameItem(item.id)}
                                onKeyDown={(e) => {
                                  e.stopPropagation()
                                  if (e.key === 'Enter') onFinishRenameItem(item.id)
                                  if (e.key === 'Escape') onCancelRenameItem()
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 py-1.5 pr-6 text-xs bg-transparent outline-none rounded px-1.5"
                                style={{
                                  color: 'var(--foreground)',
                                  border: `1px solid ${tabColor}`,
                                  minWidth: 0,
                                }}
                              />
                            ) : (
                              <button
                                onClick={() => onSelectItem(item.id)}
                                onDoubleClick={(e) => {
                                  e.stopPropagation()
                                  onStartRenameItem(item.id, item.title || '')
                                }}
                                className="relative flex-1 flex items-center gap-2 text-left py-2 px-2.5 text-[13px] rounded-lg transition-all cursor-pointer pr-7 overflow-hidden"
                                style={{
                                  backgroundColor: isActive
                                    ? `color-mix(in srgb, ${tabColor} 14%, transparent)`
                                    : 'transparent',
                                  color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                                  fontWeight: isActive ? 600 : 400,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isActive) e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${tabColor} 6%, transparent)`
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                                }}
                              >
                                {/* Active stripe */}
                                {isActive && (
                                  <span
                                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                                    style={{ backgroundColor: tabColor }}
                                  />
                                )}
                                <FileText
                                  size={11}
                                  style={{
                                    flexShrink: 0,
                                    color: isActive ? tabColor : 'var(--muted-foreground)',
                                    opacity: isActive ? 1 : 0.4,
                                    marginLeft: isActive ? '4px' : '0',
                                  }}
                                />
                                <span className="truncate flex-1">{item.title || 'Sin título'}</span>
                              </button>
                            )}

                            {!isRenamingItem && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id) }}
                                className="absolute right-1.5 opacity-0 group-hover/item:opacity-40 hover:!opacity-80 transition-opacity w-4 h-4 flex items-center justify-center rounded cursor-pointer"
                                style={{ color: 'var(--muted-foreground)' }}
                                title="Eliminar guión"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                          )}
                          </Sortable>
                        )
                      })}
                      </SortableContext>

                      {/* Add item button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddItem(tab.id) }}
                        className="flex items-center gap-1.5 w-full py-1.5 px-2 text-[11px] rounded-lg transition-all cursor-pointer mt-0.5 opacity-50 hover:opacity-100"
                        style={{ color: tabColor }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${tabColor} 8%, transparent)`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <Plus size={11} />
                        Nuevo guión
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}
              </Sortable>
            )
          })}
          </SortableContext>
          </DndContext>
        )}

        {/* ── Bottom: new folder shortcut ── */}
        {tabs.length > 0 && (
          <button
            onClick={onAddTab}
            className="flex items-center gap-2 w-[calc(100%-16px)] mx-2 mt-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer"
            style={{
              color: 'var(--muted-foreground)',
              border: '1px dashed var(--border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 7%, transparent)'
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 30%, transparent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--muted-foreground)'
            }}
          >
            <Plus size={13} />
            Nueva carpeta
          </button>
        )}
      </div>
    </div>
  )
}
