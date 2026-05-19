'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ConversationDTO } from '@/lib/types/ai'

interface ConversationSidebarProps {
  conversations: ConversationDTO[]
  activeId: string | null
  loading: boolean
  open: boolean
  onToggle: () => void
  onNew: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

type GroupKey = 'Hoy' | 'Ayer' | 'Últimos 7 días' | 'Últimos 30 días' | 'Más antiguos'

function groupFor(iso: string): GroupKey {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 1 && d.getDate() === now.getDate()) return 'Hoy'
  if (diffDays < 2) return 'Ayer'
  if (diffDays < 7) return 'Últimos 7 días'
  if (diffDays < 30) return 'Últimos 30 días'
  return 'Más antiguos'
}

const GROUP_ORDER: GroupKey[] = ['Hoy', 'Ayer', 'Últimos 7 días', 'Últimos 30 días', 'Más antiguos']

export function ConversationSidebar({
  conversations,
  activeId,
  loading,
  open,
  onToggle,
  onNew,
  onSelect,
  onDelete,
}: ConversationSidebarProps) {
  // Compute grouping post-mount to avoid SSR/CSR divergence at day/hour
  // boundaries (groupFor reads `new Date()`). The setState-in-effect is the
  // documented React pattern for deferring browser-only values.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const grouped = useMemo<Record<GroupKey, ConversationDTO[]>>(() => {
    const base: Record<GroupKey, ConversationDTO[]> = {
      'Hoy': [],
      'Ayer': [],
      'Últimos 7 días': [],
      'Últimos 30 días': [],
      'Más antiguos': [],
    }
    if (!mounted) return base
    for (const c of conversations) {
      base[groupFor(c.updatedAt)].push(c)
    }
    return base
  }, [conversations, mounted])

  return (
    <aside
      className="relative flex h-full flex-shrink-0 flex-col transition-all duration-300"
      style={{
        width: open ? '18rem' : '2.5rem',
        borderLeft: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? 'Colapsar historial' : 'Expandir historial'}
        className="absolute right-0 top-2 z-10 flex items-center justify-center rounded-l-lg p-1.5 transition-colors hover:bg-[var(--muted)]"
        style={{ color: 'var(--muted-foreground)' }}
      >
        {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Collapsed: show stacked icons */}
      {!open && (
        <div className="flex flex-col items-center gap-3 pt-10 px-1">
          <button
            type="button"
            onClick={onNew}
            aria-label="Nueva conversación"
            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--muted)]"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <Plus size={14} />
          </button>
          {conversations.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              aria-label={c.title}
              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--muted)]"
              style={{
                color: c.id === activeId ? 'var(--accent)' : 'var(--muted-foreground)',
              }}
            >
              <MessageSquare size={13} />
            </button>
          ))}
        </div>
      )}

      {/* Expanded content */}
      {open && (
        <>
          <div className="flex-shrink-0 p-3 pr-8">
            <button
              type="button"
              onClick={onNew}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 15%, var(--card))',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))',
                color: 'var(--foreground)',
              }}
            >
              <Plus size={14} />
              Nueva conversación
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 pb-4" style={{ scrollbarWidth: 'thin' }}>
            {loading && conversations.length === 0 ? (
              <div className="px-2 py-2 space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-2 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: 'var(--muted)' }} />
                    <div className="h-3 rounded flex-1" style={{ width: `${50 + (i * 13) % 40}%`, backgroundColor: 'var(--muted)' }} />
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Tus conversaciones aparecerán acá.
              </p>
            ) : (
              GROUP_ORDER.filter((g) => grouped[g].length > 0).map((group) => (
                <div key={group} className="mb-3">
                  <p
                    className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}
                  >
                    {group}
                  </p>
                  <ul className="space-y-0.5">
                    {grouped[group].map((c) => (
                      <li key={c.id}>
                        <div
                          className="group/item relative flex items-center rounded-lg"
                          style={{
                            backgroundColor:
                              c.id === activeId
                                ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                                : 'transparent',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onSelect(c.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-[var(--muted)]"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <MessageSquare size={12} className="flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                            <span className="truncate">{c.title}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(c.id)}
                            aria-label="Eliminar conversación"
                            className="mr-1 flex-shrink-0 rounded p-1 opacity-0 transition-opacity group-hover/item:opacity-100 hover:bg-[var(--muted)]"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </nav>
        </>
      )}
    </aside>
  )
}
