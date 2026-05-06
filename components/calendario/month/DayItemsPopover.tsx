'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check, Circle, CircleDashed, Flag, X } from 'lucide-react'
import type { ContentItem, UnifiedStatus } from '@/lib/types'

interface DayItemsPopoverProps {
  date: string
  items: ContentItem[]
  anchor: { x: number; y: number }
  onItemClick: (item: ContentItem) => void
  onClose: () => void
}

function StatusIcon({ status, color }: { status: UnifiedStatus; color: string }) {
  const common = { size: 12, strokeWidth: 2.5, style: { color, flexShrink: 0 } }
  switch (status) {
    case 'publicado':  return <Check {...common} />
    case 'programado': return <Flag {...common} />
    case 'en-proceso': return <CircleDashed {...common} />
    case 'drafts':
    default:           return <Circle {...common} />
  }
}

const STATUS_LABEL: Record<UnifiedStatus, string> = {
  drafts:       'Drafts',
  'en-proceso': 'En proceso',
  programado:   'Programado',
  publicado:    'Publicado',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

export function DayItemsPopover({ date, items, anchor, onItemClick, onClose }: DayItemsPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const POP_W = 280
  const POP_H = Math.min(400, 64 + items.length * 48)
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const left = Math.max(8, Math.min(anchor.x, vw - POP_W - 8))
  const top = anchor.y + POP_H + 8 > vh ? Math.max(8, anchor.y - POP_H - 8) : anchor.y + 8

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={popRef}
        role="dialog"
        aria-label={`Items del ${formatDate(date)}`}
        className="fixed z-50 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
        style={{
          left,
          top,
          width: POP_W,
          maxHeight: POP_H,
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>
              {formatDate(date)}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: 'var(--foreground)' }}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="p-1 rounded-md transition-colors"
            style={{ color: 'var(--muted-foreground)', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--muted)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
          >
            <X size={14} strokeWidth={2.25} />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ padding: 4 }}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onItemClick(item); onClose() }}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer focus-visible:outline-none"
              style={{
                backgroundColor: 'transparent',
                minHeight: 44,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--muted)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px var(--accent)` }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            >
              <span
                aria-hidden
                style={{
                  width: 4,
                  height: 28,
                  borderRadius: 2,
                  backgroundColor: item.color,
                  flexShrink: 0,
                }}
              />
              <div className="flex-1 min-w-0 flex flex-col">
                <span
                  className="truncate text-[13px] font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  {item.title}
                </span>
                <span
                  className="text-[11px] flex items-center gap-1 mt-0.5"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <StatusIcon status={item.status} color={item.color} />
                  <span>{STATUS_LABEL[item.status]}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body,
  )
}
