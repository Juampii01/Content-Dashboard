'use client'

/**
 * ThemePicker — admin-only brand theme selector in the TopBar.
 *
 * Renders null for non-admins. Allows admins to switch between available
 * brand themes (eternity, govbidder) via a pill + dropdown. Persists choice
 * in localStorage via useTheme().setTheme(). Change is instantaneous —
 * no page reload.
 */

import { useEffect, useRef, useState } from 'react'
import { Palette, Check } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import type { ThemeKey } from '@/lib/themes'

const THEME_LABELS: Record<ThemeKey, { label: string; dot: string }> = {
  eternity:  { label: 'Eternity',  dot: '#8E1F2F' },
  govbidder: { label: 'GovBidder', dot: '#1D4ED8' },
}

export function ThemePicker() {
  const { currentTheme, setTheme, availableThemes, isAdmin } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Admin-only
  if (!isAdmin) return null

  const meta = THEME_LABELS[currentTheme]

  return (
    <div ref={ref} className="relative">
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80 cursor-pointer"
        style={{
          border: '1px solid var(--border)',
          backgroundColor: open ? 'var(--muted)' : 'var(--card)',
          color: 'var(--muted-foreground)',
        }}
        title="Tema de marca"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Palette size={12} style={{ color: 'var(--accent)' }} />
        <span
          className="hidden sm:inline h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: meta.dot }}
        />
        <span className="hidden sm:inline">{meta.label}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Seleccionar tema"
          className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-modal)',
          }}
        >
          <div className="p-1">
            {(availableThemes as readonly ThemeKey[]).map((key) => {
              const m = THEME_LABELS[key]
              const isActive = currentTheme === key
              return (
                <button
                  key={key}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setTheme(key)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                    color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--muted)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {/* Color dot */}
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: m.dot }}
                  />
                  <span className="flex-1 font-medium">{m.label}</span>
                  {isActive && (
                    <Check size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
