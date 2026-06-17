'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useState } from 'react'
import type { GuionTab, GuionItem } from '@/lib/types'
import { GuionesGrid } from './guiones/GuionesGrid'
import { GuionEditor } from './guiones/GuionEditor'
import { EmojiPickerPortal } from './guiones/EmojiPicker'
import { toast } from 'sonner'

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
    setLoading(true)
    try {
      const res = await fetch(`/api/guiones/tabs?type=${encodeURIComponent(type)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { tabs: DbGuionTab[] }
      const fetchedTabs  = data.tabs.map(toGuionTab)
      const fetchedItems = data.tabs.flatMap(t => t.items.map(toGuionItem))
      setTabs(fetchedTabs)
      setItems(fetchedItems)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Error al cargar guiones: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => { void loadTabs() }, [loadTabs])

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
    try {
      const res = await fetch('/api/guiones/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nueva carpeta', type, order: tabs.length }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { tab: DbGuionTab }
      const newTab = toGuionTab(data.tab)
      setTabs(prev => [...prev, newTab])
      setExpandedTabId(newTab.id)
      setRenamingTabId(newTab.id)
      setRenameVal('Nueva carpeta')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Error al crear carpeta: ${msg}`)
    }
  }

  const deleteTab = async (tabId: string) => {
    // Optimistic update
    const prevTabs  = tabs
    const prevItems = items
    setTabs(prev => prev.filter(t => t.id !== tabId))
    setItems(prev => prev.filter(i => i.tabId !== tabId))
    if (expandedTabId === tabId) setExpandedTabId(null)
    setMenuTabId(null)

    try {
      const res = await fetch(`/api/guiones/tabs/${tabId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err: unknown) {
      // Rollback
      setTabs(prevTabs)
      setItems(prevItems)
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Error al eliminar carpeta: ${msg}`)
    }
  }

  const setTabEmoji = async (tabId: string, emoji: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, emoji } : t))
    setEmojiTabId(null)
    setEmojiAnchor(null)

    try {
      const res = await fetch(`/api/guiones/tabs/${tabId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      // Soft fail — emoji is cosmetic, don't disrupt UX with rollback
    }
  }

  const clearTabEmoji = async (tabId: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, emoji: '' } : t))
    setMenuTabId(null)

    try {
      await fetch(`/api/guiones/tabs/${tabId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: '' }),
      })
    } catch {
      // Soft fail — cosmetic
    }
  }

  const finishRename = async (tabId: string) => {
    const name = renameVal.trim() || 'Sin título'
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, name } : t))
    setRenamingTabId(null)

    try {
      const res = await fetch(`/api/guiones/tabs/${tabId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      // Keep optimistic name — user already sees the new name
    }
  }

  // ─── Item operations ─────────────────────────────────────────────────────

  const addItem = async (tabId: string) => {
    try {
      const res = await fetch(`/api/guiones/tabs/${tabId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nuevo guión', order: items.filter(i => i.tabId === tabId).length }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { item: DbGuionItem }
      const newItem = toGuionItem(data.item)
      setItems(prev => [...prev, newItem])
      setActiveItemId(newItem.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Error al crear guión: ${msg}`)
    }
  }

  const deleteItem = async (id: string) => {
    const prevItems = items
    const next = items.filter(i => i.id !== id)
    setItems(next)
    if (activeItemId === id) {
      setActiveItemId(next.length > 0 ? next[next.length - 1].id : null)
    }

    try {
      const res = await fetch(`/api/guiones/items/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err: unknown) {
      // Rollback
      setItems(prevItems)
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Error al eliminar guión: ${msg}`)
    }
  }

  const updateActive = async (patch: Partial<GuionItem>) => {
    if (!activeItemId) return
    const now = new Date().toISOString()
    setItems(prev =>
      prev.map(i => i.id === activeItemId ? { ...i, ...patch, updatedAt: now } : i)
    )
    // Fire-and-forget — save indicator in editor handles feedback
    await fetch(`/api/guiones/items/${activeItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => {
      toast.error('Error al guardar — revisá tu conexión')
    })
  }

  const finishRenameItem = async (itemId: string) => {
    const name = renameItemVal.trim() || 'Sin título'
    const now = new Date().toISOString()
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, title: name, updatedAt: now } : i))
    setRenamingItemId(null)

    try {
      await fetch(`/api/guiones/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name }),
      })
    } catch {
      // Keep optimistic name
    }
  }

  const activeItem = items.find(i => i.id === activeItemId) ?? null

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="flex flex-col md:flex-row overflow-hidden rounded-2xl"
        style={{
          minHeight: '70vh',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Sidebar skeleton */}
        <div className="w-full md:w-72 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="h-3 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-7 w-7 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
          <div className="flex-1 py-3 px-2.5 space-y-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl">
                <div className="w-7 h-7 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
                <div className="h-3 flex-1 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
                <div className="h-4 w-5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
              </div>
            ))}
          </div>
        </div>
        {/* Editor skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="px-8 pt-7 pb-5 flex-shrink-0 space-y-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="h-3 w-14 rounded-full animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-8 w-72 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
          <div className="flex-1 px-8 py-8 space-y-3.5">
            {[80, 100, 60, 90, 70, 85].map((w, i) => (
              <div key={i} className="h-3.5 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)', width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col md:flex-row overflow-hidden rounded-2xl"
      style={{
        minHeight: '70vh',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
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
