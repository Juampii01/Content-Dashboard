'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useState } from 'react'
import type { GuionTab, GuionItem } from '@/lib/types'
import { GuionesGrid } from './guiones/GuionesGrid'
import { GuionEditor } from './guiones/GuionEditor'
import { EmojiPickerPortal } from './guiones/EmojiPicker'

// ─── DB row shapes (API responses mirror Prisma types) ────────────────────────

type DbGuionTab = {
  id: string
  name: string
  type: string
  emoji: string
  order: number
  createdAt: string
  items: DbGuionItem[]
}

type DbGuionItem = {
  id: string
  tabId: string
  title: string
  content: string
  order: number
  createdAt: string
  updatedAt: string
}

function toGuionTab(t: DbGuionTab): GuionTab {
  return { id: t.id, name: t.name, emoji: t.emoji, createdAt: t.createdAt }
}

function toGuionItem(i: DbGuionItem): GuionItem {
  return { id: i.id, tabId: i.tabId, title: i.title, content: i.content, createdAt: i.createdAt, updatedAt: i.updatedAt }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GuionesSectionProps {
  /** 'reel' | 'historia' — maps to GuionTab.type in DB */
  type: string
  label: string
}

export function GuionesSection({ type, label }: GuionesSectionProps) {
  const [tabs,  setTabs]  = useState<GuionTab[]>([])
  const [items, setItems] = useState<GuionItem[]>([])
  const [loading, setLoading] = useState(true)

  const [activeItemId,  setActiveItemId]  = useState<string | null>(null)
  const [expandedTabId, setExpandedTabId] = useState<string | null>(null)

  const [menuTabId,   setMenuTabId]   = useState<string | null>(null)
  const [emojiTabId,  setEmojiTabId]  = useState<string | null>(null)
  const [emojiAnchor, setEmojiAnchor] = useState<{ top: number; left: number } | null>(null)

  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renameVal,     setRenameVal]     = useState('')

  const [renamingItemId, setRenamingItemId] = useState<string | null>(null)
  const [renameItemVal,  setRenameItemVal]  = useState('')

  const menuRef   = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  // ─── Load from API on mount ──────────────────────────────────────────────

  const loadTabs = useCallback(async () => {
    try {
      const res = await fetch(`/api/guiones/tabs?type=${encodeURIComponent(type)}`)
      if (!res.ok) return
      const data = await res.json() as { tabs: DbGuionTab[] }
      const fetchedTabs  = data.tabs.map(toGuionTab)
      const fetchedItems = data.tabs.flatMap(t => t.items.map(toGuionItem))
      setTabs(fetchedTabs)
      setItems(fetchedItems)
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => { loadTabs() }, [loadTabs])

  // Auto-expand the first tab on initial load
  useEffect(() => {
    if (!initializedRef.current && tabs.length > 0) {
      setExpandedTabId(tabs[0].id)
      initializedRef.current = true
    }
  }, [tabs])

  // Close context menus on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuTabId(null)
      }
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setEmojiTabId(null)
        setEmojiAnchor(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // ─── Tab operations ──────────────────────────────────────────────────────

  const addTab = async () => {
    const res = await fetch('/api/guiones/tabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nueva pestaña', type, order: tabs.length }),
    })
    if (!res.ok) return
    const data = await res.json() as { tab: DbGuionTab }
    const newTab = toGuionTab(data.tab)
    setTabs(prev => [...prev, newTab])
    setExpandedTabId(newTab.id)
    setRenamingTabId(newTab.id)
    setRenameVal('Nueva pestaña')
  }

  const deleteTab = async (tabId: string) => {
    // Optimistic update
    setTabs(prev => prev.filter(t => t.id !== tabId))
    setItems(prev => prev.filter(i => i.tabId !== tabId))
    if (expandedTabId === tabId) setExpandedTabId(null)
    setMenuTabId(null)

    await fetch(`/api/guiones/tabs/${tabId}`, { method: 'DELETE' })
  }

  const setTabEmoji = async (tabId: string, emoji: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, emoji } : t))
    setEmojiTabId(null)
    setEmojiAnchor(null)

    await fetch(`/api/guiones/tabs/${tabId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
  }

  const clearTabEmoji = async (tabId: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, emoji: '' } : t))
    setMenuTabId(null)

    await fetch(`/api/guiones/tabs/${tabId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '' }),
    })
  }

  const finishRename = async (tabId: string) => {
    const name = renameVal.trim() || 'Sin título'
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, name } : t))
    setRenamingTabId(null)

    await fetch(`/api/guiones/tabs/${tabId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  }

  // ─── Item operations ─────────────────────────────────────────────────────

  const addItem = async (tabId: string) => {
    const res = await fetch(`/api/guiones/tabs/${tabId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nuevo guión', order: items.filter(i => i.tabId === tabId).length }),
    })
    if (!res.ok) return
    const data = await res.json() as { item: DbGuionItem }
    const newItem = toGuionItem(data.item)
    setItems(prev => [...prev, newItem])
    setActiveItemId(newItem.id)
  }

  const deleteItem = async (id: string) => {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    if (activeItemId === id) {
      setActiveItemId(next.length > 0 ? next[next.length - 1].id : null)
    }

    await fetch(`/api/guiones/items/${id}`, { method: 'DELETE' })
  }

  const updateActive = async (patch: Partial<GuionItem>) => {
    if (!activeItemId) return
    const now = new Date().toISOString()
    setItems(prev =>
      prev.map(i => i.id === activeItemId ? { ...i, ...patch, updatedAt: now } : i)
    )

    await fetch(`/api/guiones/items/${activeItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  const finishRenameItem = async (itemId: string) => {
    const name = renameItemVal.trim() || 'Sin título'
    const now = new Date().toISOString()
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, title: name, updatedAt: now } : i))
    setRenamingItemId(null)

    await fetch(`/api/guiones/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name }),
    })
  }

  const activeItem = items.find(i => i.id === activeItemId) ?? null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ minHeight: '70vh' }}>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>Cargando guiones…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full" style={{ minHeight: '70vh' }}>
      <GuionesGrid
        tabs={tabs}
        items={items}
        activeItemId={activeItemId}
        expandedTabId={expandedTabId}
        menuTabId={menuTabId}
        renamingTabId={renamingTabId}
        renameVal={renameVal}
        renamingItemId={renamingItemId}
        renameItemVal={renameItemVal}
        menuRef={menuRef}
        onAddTab={addTab}
        onDeleteTab={deleteTab}
        onSetExpandedTab={setExpandedTabId}
        onOpenEmojiPicker={(tabId, anchor) => {
          setEmojiTabId(tabId)
          setEmojiAnchor(anchor)
          setMenuTabId(null)
        }}
        onToggleMenu={tabId => {
          setMenuTabId(menuTabId === tabId ? null : tabId)
          setEmojiTabId(null)
        }}
        onClearTabEmoji={clearTabEmoji}
        onStartRenameTab={(tabId, name) => { setRenamingTabId(tabId); setRenameVal(name) }}
        onRenameValChange={setRenameVal}
        onFinishRenameTab={finishRename}
        onCancelRenameTab={() => setRenamingTabId(null)}
        onSelectItem={setActiveItemId}
        onStartRenameItem={(itemId, title) => { setRenamingItemId(itemId); setRenameItemVal(title) }}
        onRenameItemValChange={setRenameItemVal}
        onFinishRenameItem={finishRenameItem}
        onCancelRenameItem={() => setRenamingItemId(null)}
        onDeleteItem={deleteItem}
        onAddItem={addItem}
      />

      {emojiTabId && emojiAnchor && (
        <EmojiPickerPortal
          tabId={emojiTabId}
          anchor={emojiAnchor}
          onSelect={setTabEmoji}
          pickerRef={pickerRef}
        />
      )}

      <GuionEditor
        activeItem={activeItem}
        hasTabs={tabs.length > 0}
        label={label}
        type={type}
        onUpdate={updateActive}
        onDelete={deleteItem}
      />
    </div>
  )
}
