'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, CalendarClock } from 'lucide-react'
import { ContentItem, ContentPiece, ContentCategory, ContentTemplate, UnifiedStatus } from '@/lib/types'
import { CalendarMonthView } from './CalendarMonthView'
import { CalendarWeekView } from './CalendarWeekView'
import { ContentItemModal } from './ContentItemModal'
import { TemplatePickerModal } from './TemplatePickerModal'
import { DayItemsPopover } from './month/DayItemsPopover'
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog'
import { addDays, toDateStr } from './month/calendarUtils'
import { stripHtml } from '@/lib/utils/stripHtml'
import { toast } from 'sonner'
import {
  ViewMode,
  STATUSES,
  getMondayOfWeek,
  REEL_CATEGORIES,
  HISTORIA_CATEGORIES,
} from './lib/calendarioConstants'
import {
  fetchAllItems,
  fetchTemplates,
  apiCreateItem,
  apiUpdateItem,
  apiDeleteItem,
  apiDeleteTemplate,
} from './lib/calendarioApi'
import { CalendarioToolbar } from './CalendarioToolbar'
import { CalendarioFilters } from './CalendarioFilters'

// ─── Component ────────────────────────────────────────────────────────────

interface CalendarioTabProps {
  type: 'reel' | 'historia'
}

export function CalendarioTab({ type }: CalendarioTabProps) {
  const today = useMemo(() => new Date(), [])
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [viewDirection, setViewDirection] = useState<1 | -1>(1)
  const prevViewRef = useRef<ViewMode>('month')

  const switchView = useCallback((next: ViewMode) => {
    const views: ViewMode[] = ['month', 'week']
    const from = views.indexOf(prevViewRef.current)
    const to = views.indexOf(next)
    setViewDirection(to > from ? 1 : -1)
    prevViewRef.current = next
    setViewMode(next)
  }, [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [weekStart, setWeekStart] = useState(getMondayOfWeek(today))
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward')

  // Data state
  const [allItems, setAllItems] = useState<ContentPiece[]>([])
  const [templates, setTemplates] = useState<ContentTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState<{ open: boolean; item?: ContentItem | null; defaultDate?: string; prefill?: ContentTemplate }>({ open: false })
  const [filterCategory, setFilterCategory] = useState<ContentCategory | null>(null)
  const [statusFilter, setStatusFilter] = useState<UnifiedStatus[]>([])

  const [picker, setPicker] = useState<{ defaultDate: string; anchor: { x: number; y: number } } | null>(null)

  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Overflow popover
  const [overflowPopover, setOverflowPopover] = useState<{ date: string; items: ContentItem[]; anchor: { x: number; y: number } } | null>(null)

  // Keyboard shortcuts dialog
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Load data on mount
  useEffect(() => {
    Promise.all([fetchAllItems(), fetchTemplates(type)])
      .then(([allPieces, tmpl]) => {
        setAllItems(allPieces)
        setTemplates(tmpl)
      })
      .catch(() => toast.error('Error al cargar el calendario'))
      .finally(() => setLoading(false))
  }, [type])

  // Items for this calendar: same type, must have a date set
  const items = useMemo(
    () => allItems.filter((i) => i.type === type && !!i.date) as ContentItem[],
    [allItems, type],
  )

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 150)
    return () => clearTimeout(t)
  }, [searchInput])

  const handleSave = async (data: Omit<ContentItem, 'id' | 'createdAt' | 'order'> & { id?: string }) => {
    if (data.id) {
      try {
        const updated = await apiUpdateItem(data.id, data)
        setAllItems((prev) => prev.map((i) => i.id === data.id ? updated : i))
      } catch {
        toast.error('Error al guardar')
      }
    } else {
      try {
        const created = await apiCreateItem({ ...data, order: items.length })
        setAllItems((prev) => [...prev, created])
      } catch {
        toast.error('Error al crear')
      }
    }
  }

  const handleDelete = async (id: string) => {
    setAllItems((prev) => prev.filter((i) => i.id !== id))
    try {
      await apiDeleteItem(id)
    } catch {
      toast.error('Error al eliminar')
      // Refetch to restore consistency
      fetchAllItems().then(setAllItems).catch(() => {})
    }
  }

  const handleResize = async (id: string, startDate: string, endDate: string) => {
    const patch = { date: startDate, endDate: startDate === endDate ? undefined : endDate }
    setAllItems((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i))
    try {
      await apiUpdateItem(id, patch)
    } catch {
      toast.error('Error al redimensionar')
    }
  }

  const handleCycleStatus = useCallback(async (id: string) => {
    const item = allItems.find((i) => i.id === id)
    if (!item) return
    const idx = STATUSES.indexOf(item.status)
    const next = STATUSES[(idx + 1) % STATUSES.length]
    setAllItems((prev) => prev.map((i) => i.id === id ? { ...i, status: next } : i))
    try {
      await apiUpdateItem(id, { status: next })
    } catch {
      toast.error('Error al cambiar estado')
    }
  }, [allItems])

  const handleDuplicate = useCallback(async (id: string) => {
    const original = allItems.find((i) => i.id === id) as ContentItem | undefined
    if (!original) return
    const newStart = addDays(original.date, 1)
    const newEnd = original.endDate ? addDays(original.endDate, 1) : undefined
    try {
      const created = await apiCreateItem({
        ...original,
        date: newStart,
        endDate: newEnd,
        order: items.length,
      })
      setAllItems((prev) => [...prev, created])
    } catch {
      toast.error('Error al duplicar')
    }
  }, [allItems, items.length])

  const handleDeleteTemplate = async (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    try {
      await apiDeleteTemplate(id)
    } catch {
      toast.error('Error al eliminar plantilla')
      fetchTemplates(type).then(setTemplates).catch(() => {})
    }
  }

  const toggleStatus = (s: UnifiedStatus) => {
    setStatusFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  const prevMonth = useCallback(() => {
    setNavDirection('back')
    setMonth((m) => {
      if (m === 0) { setYear((y) => y - 1); return 11 }
      return m - 1
    })
  }, [])
  const nextMonth = useCallback(() => {
    setNavDirection('forward')
    setMonth((m) => {
      if (m === 11) { setYear((y) => y + 1); return 0 }
      return m + 1
    })
  }, [])
  const prevWeek = useCallback(() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n }), [])
  const nextWeek = useCallback(() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n }), [])

  const goToday = useCallback(() => {
    const t = new Date()
    if (viewMode === 'month') { setYear(t.getFullYear()); setMonth(t.getMonth()) }
    else setWeekStart(getMondayOfWeek(t))
  }, [viewMode])

  // Filtered items (category, status, search)
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return items.filter((i) => {
      if (filterCategory && i.category !== filterCategory) return false
      if (statusFilter.length > 0 && !statusFilter.includes(i.status)) return false
      if (q) {
        const hay = `${i.title} ${stripHtml(i.description)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [items, filterCategory, statusFilter, searchQuery])

  const matchCount = searchQuery.trim() ? filteredItems.length : 0

  // ── Stable keyboard shortcut handler ──────────────────────────────────────
  const kbRef = useRef({
    viewMode, year, month, today,
    modalOpen: modal.open, picker, overflowPopover, shortcutsOpen, searchOpen,
    prevMonth, nextMonth, prevWeek, nextWeek, goToday,
    setSearchInput, setSearchOpen, setPicker, setShortcutsOpen,
  })
  // eslint-disable-next-line react-hooks/refs -- keep latest values accessible to stable keyboard handler without re-binding listeners
  kbRef.current = {
    viewMode, year, month, today,
    modalOpen: modal.open, picker, overflowPopover, shortcutsOpen, searchOpen,
    prevMonth, nextMonth, prevWeek, nextWeek, goToday,
    setSearchInput, setSearchOpen, setPicker, setShortcutsOpen,
  }

  useEffect(() => {
    const isTypingContext = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
    }

    const handler = (e: KeyboardEvent) => {
      const s = kbRef.current

      if (isTypingContext(e.target)) {
        if (e.key === 'Escape' && s.searchOpen) {
          e.preventDefault()
          s.setSearchInput('')
          s.setSearchOpen(false)
          ;(e.target as HTMLElement).blur()
        }
        return
      }

      const modalsOpen = s.modalOpen || s.picker !== null || s.overflowPopover !== null || s.shortcutsOpen

      if (e.key === '/' && !modalsOpen) {
        e.preventDefault()
        s.setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 0)
        return
      }

      if (modalsOpen) return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        const d = s.viewMode === 'month'
          ? toDateStr(new Date(s.year, s.month, Math.min(s.today.getDate(), new Date(s.year, s.month + 1, 0).getDate())))
          : toDateStr(new Date())
        setModal({ open: true, item: null, defaultDate: d })
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        s.goToday()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (s.viewMode === 'month') s.prevMonth(); else s.prevWeek()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (s.viewMode === 'month') s.nextMonth(); else s.nextWeek()
      } else if (e.key === '?') {
        e.preventDefault()
        s.setShortcutsOpen(true)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const title = type === 'reel' ? 'Calendario Reels' : 'Calendario Historias'
  const Icon = type === 'reel' ? CalendarDays : CalendarClock
  const typeCategories = type === 'reel' ? REEL_CATEGORIES : HISTORIA_CATEGORIES

  const categoryCounts: Record<string, number> = {}
  for (const it of items) {
    if (it.category) categoryCounts[it.category] = (categoryCounts[it.category] ?? 0) + 1
  }

  if (loading) {
    return (
      <div className="space-y-5">
        {/* Header skeleton */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-5 w-40 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-9 w-28 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
        </div>
        {/* Category chips skeleton */}
        <div className="flex flex-wrap gap-2">
          {[80, 95, 70, 110, 85].map((w, i) => (
            <div key={i} className="h-6 rounded-full animate-pulse" style={{ width: w, backgroundColor: 'var(--muted)', animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
        {/* Calendar grid skeleton */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: 'var(--border)' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="px-2 py-2.5" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="h-3 w-8 rounded animate-pulse mx-auto" style={{ backgroundColor: 'var(--border)' }} />
              </div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[80px] p-2 space-y-1" style={{ backgroundColor: 'var(--card)' }}>
                <div className="h-4 w-4 rounded-full animate-pulse" style={{ backgroundColor: 'var(--muted)', animationDelay: `${i * 20}ms` }} />
                {i % 5 === 0 && <div className="h-5 w-full rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />}
                {i % 7 === 1 && <div className="h-5 w-3/4 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Icon size={20} style={{ color: 'var(--accent)' }} strokeWidth={2.25} />
          <h2
            className="text-base font-bold tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            {title}
          </h2>
        </div>

        <div className="flex flex-col items-end gap-2">
          <CalendarioToolbar
            viewMode={viewMode}
            year={year}
            month={month}
            weekStart={weekStart}
            searchOpen={searchOpen}
            searchInput={searchInput}
            searchQuery={searchQuery}
            matchCount={matchCount}
            searchInputRef={searchInputRef}
            onSearchToggle={() => {
              if (searchOpen) {
                setSearchInput('')
                setSearchOpen(false)
              } else {
                setSearchOpen(true)
                setTimeout(() => searchInputRef.current?.focus(), 0)
              }
            }}
            onSearchInput={(v) => setSearchInput(v)}
            onSearchClear={() => { setSearchInput(''); searchInputRef.current?.focus() }}
            onViewChange={switchView}
            onGoToday={goToday}
            onPrev={viewMode === 'month' ? prevMonth : prevWeek}
            onNext={viewMode === 'month' ? nextMonth : nextWeek}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            onAdd={() => {
              setModal({ open: true, item: null, defaultDate: new Date().toISOString().split('T')[0] })
            }}
          />
        </div>
      </div>

      {/* Category chips + Status filter — same row, aligned */}
      <CalendarioFilters
        totalCount={items.length}
        typeCategories={typeCategories}
        categoryCounts={categoryCounts}
        filterCategory={filterCategory}
        onCategoryChange={setFilterCategory}
        statusFilter={statusFilter}
        onToggleStatus={toggleStatus}
        onClearStatus={() => setStatusFilter([])}
      />

      <AnimatePresence mode="wait" custom={viewDirection}>
        <motion.div
          key={viewMode}
          custom={viewDirection}
          variants={{
            initial: (d: number) => ({ opacity: 0, x: d * 28 }),
            animate: { opacity: 1, x: 0 },
            exit: (d: number) => ({ opacity: 0, x: d * -28 }),
          }}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          {viewMode === 'month' ? (
            <CalendarMonthView
              year={year}
              month={month}
              navDirection={navDirection}
              items={filteredItems}
              onDayClick={(date) => setModal({ open: true, item: null, defaultDate: date })}
              onItemClick={(item) => setModal({ open: true, item })}
              onItemResize={handleResize}
              onOverflowClick={(date, dayItems, anchor) => setOverflowPopover({ date, items: dayItems, anchor })}
              onCycleStatus={handleCycleStatus}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ) : (
            <CalendarWeekView
              weekStart={weekStart}
              items={filteredItems}
              onDayClick={(date) => setModal({ open: true, item: null, defaultDate: date })}
              onItemClick={(item) => setModal({ open: true, item })}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {modal.open && (
          <ContentItemModal
            key="content-item-modal"
            item={modal.item}
            defaultDate={modal.defaultDate}
            prefill={modal.prefill}
            type={type}
            onSave={handleSave}
            onDelete={modal.item ? handleDelete : undefined}
            onClose={() => setModal({ open: false })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {picker && (
          <TemplatePickerModal
            key="template-picker"
            type={type}
            templates={templates}
            anchor={picker.anchor}
            onSelectBlank={() => {
              setModal({ open: true, item: null, defaultDate: picker.defaultDate })
              setPicker(null)
            }}
            onSelectTemplate={(template) => {
              setModal({ open: true, item: null, defaultDate: picker.defaultDate, prefill: template })
              setPicker(null)
            }}
            onDeleteTemplate={handleDeleteTemplate}
            onClose={() => setPicker(null)}
          />
        )}
      </AnimatePresence>

      {overflowPopover && (
        <DayItemsPopover
          date={overflowPopover.date}
          items={overflowPopover.items}
          anchor={overflowPopover.anchor}
          onItemClick={(item) => setModal({ open: true, item })}
          onClose={() => setOverflowPopover(null)}
        />
      )}

      {shortcutsOpen && (
        <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} />
      )}
    </div>
  )
}
