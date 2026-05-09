'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import type { ContentItem } from '@/lib/types'

interface QuickActionsProps {
  item: ContentItem
  onCycleStatus: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

interface DeleteConfirmProps {
  title: string
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirm({ title, onConfirm, onCancel }: DeleteConfirmProps) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar eliminación"
      className="fixed inset-0 flex items-center justify-center glass-overlay"
      style={{ zIndex: 9999 }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
          width: 320,
          maxWidth: 'calc(100vw - 32px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 44,
              height: 44,
              backgroundColor: 'color-mix(in srgb, var(--destructive) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--destructive) 30%, var(--border))',
            }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--destructive)' }} strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--foreground)' }}>
              ¿Eliminar este contenido?
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              &ldquo;{title}&rdquo; se eliminará permanentemente.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-sm font-medium py-2 rounded-xl transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--border)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--muted)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 text-sm font-semibold py-2 rounded-xl transition-all cursor-pointer"
            style={{
              backgroundColor: 'var(--destructive)',
              color: 'var(--destructive-foreground)',
              border: '1px solid color-mix(in srgb, var(--destructive) 70%, transparent)',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--destructive) 25%, transparent)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.filter = 'brightness(1.08)'
              el.style.transform = 'translateY(-1px)'
              el.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--destructive) 35%, transparent)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.filter = 'none'
              el.style.transform = 'translateY(0)'
              el.style.boxShadow = '0 2px 8px color-mix(in srgb, var(--destructive) 25%, transparent)'
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Mini-toolbar that appears on hover over an EventBar.
 * Uses `data-quick-action` so the parent EventBar's handlePointerDown ignores it.
 * Buttons are 20x20 on pointer:fine, expand to 44x44 on pointer:coarse (touch).
 */
export function QuickActions({ item, onCycleStatus, onDuplicate, onDelete }: QuickActionsProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const stop = (e: React.SyntheticEvent) => { e.stopPropagation(); e.preventDefault() }

  const btnStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    color: 'var(--muted-foreground)',
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 150ms ease, color 150ms ease, transform 150ms cubic-bezier(0.16,1,0.3,1)',
  }

  return (
    <>
      <div
        data-quick-action="container"
        className="quick-actions absolute flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          right: -2,
          top: '50%',
          transform: 'translate(100%, -50%)',
          zIndex: 30,
          paddingLeft: 6,
          pointerEvents: 'auto',
        }}
        onPointerDown={stop}
        onMouseDown={stop}
      >
        <button
          type="button"
          data-quick-action="cycle"
          aria-label="Cambiar estado"
          title="Cambiar estado"
          onClick={(e) => { stop(e); onCycleStatus(item.id) }}
          onPointerDown={stop}
          className="qa-btn"
          style={btnStyle}
        >
          <RefreshCw size={12} strokeWidth={2.25} />
        </button>
        <button
          type="button"
          data-quick-action="duplicate"
          aria-label="Duplicar"
          title="Duplicar al día siguiente"
          onClick={(e) => { stop(e); onDuplicate(item.id) }}
          onPointerDown={stop}
          className="qa-btn"
          style={btnStyle}
        >
          <Copy size={12} strokeWidth={2.25} />
        </button>
        <button
          type="button"
          data-quick-action="delete"
          aria-label="Eliminar"
          title="Eliminar"
          onClick={(e) => { stop(e); setShowConfirm(true) }}
          onPointerDown={stop}
          className="qa-btn qa-btn-danger"
          style={btnStyle}
        >
          <Trash2 size={12} strokeWidth={2.25} />
        </button>

        <style jsx>{`
          .qa-btn {
            width: 20px;
            height: 20px;
          }
          .qa-btn:hover {
            background-color: var(--muted) !important;
            color: var(--foreground) !important;
            transform: translateY(-1px);
          }
          .qa-btn:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
          }
          .qa-btn-danger:hover {
            background-color: #ef444420 !important;
            color: #ef4444 !important;
            border-color: #ef444455 !important;
          }
          @media (pointer: coarse) {
            .qa-btn {
              width: 44px;
              height: 44px;
            }
          }
        `}</style>
      </div>

      {showConfirm && (
        <DeleteConfirm
          title={item.title}
          onConfirm={() => { setShowConfirm(false); onDelete(item.id) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
