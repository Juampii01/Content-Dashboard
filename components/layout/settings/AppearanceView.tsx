'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Check, ArrowLeft } from 'lucide-react'
import type { ThemeKey } from '@/lib/themes'
import { VALID_THEME_KEYS } from '@/lib/themes'

type Mode = 'dark' | 'light'

const THEME_META: Record<ThemeKey, { label: string; desc: string; accent: string; bg: string; text: string }> = {
  eternity: {
    label: 'Eternity',
    desc: 'Rojo profundo · Tipografía Fira Sans',
    accent: '#8E1F2F',
    bg: '#0F0F0F',
    text: '#F5EDE3',
  },
  govbidder: {
    label: 'GovBidder',
    desc: 'Azul institucional · Tipografía Raleway',
    accent: '#1D4ED8',
    bg: '#F8FAFC',
    text: '#0F172A',
  },
}

function readCurrentTheme(): ThemeKey {
  const t = document.documentElement.dataset.theme
  return (VALID_THEME_KEYS as readonly string[]).includes(t ?? '') ? (t as ThemeKey) : 'eternity'
}

function readCurrentMode(): Mode {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

function storageKey(themeKey: string): string {
  return `eternity_theme:${themeKey}`
}

interface AppearanceViewProps {
  onBack: () => void
}

export function AppearanceView({ onBack }: AppearanceViewProps) {
  const [brandTheme, setBrandTheme] = useState<ThemeKey>('eternity')
  const [mode, setMode] = useState<Mode>('dark')
  const [changingTheme, setChangingTheme] = useState<ThemeKey | null>(null)

  useEffect(() => {
    setBrandTheme(readCurrentTheme())
    setMode(readCurrentMode())
  }, [])

  // ── Toggle dark / light mode ─────────────────────────────────────────────
  function toggleMode() {
    const next: Mode = mode === 'dark' ? 'light' : 'dark'
    const html = document.documentElement
    const themeKey = readCurrentTheme()
    html.classList.toggle('dark', next === 'dark')
    html.classList.toggle('light', next === 'light')
    localStorage.setItem(storageKey(themeKey), next)
    setMode(next)
  }

  // ── Change brand theme ────────────────────────────────────────────────────
  async function handleBrandTheme(next: ThemeKey) {
    if (next === brandTheme) return
    setChangingTheme(next)
    try {
      await fetch('/api/me/brand-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: next }),
      })
      // Apply immediately without reload
      document.documentElement.dataset.theme = next
      document.cookie = `user_brand_theme=${next}; max-age=${365 * 24 * 3600}; path=/; SameSite=Lax`
      // Restore the user's preferred mode for the new theme
      const stored = localStorage.getItem(storageKey(next))
      const nextMode: Mode = stored === 'light' ? 'light' : next === 'govbidder' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', nextMode === 'dark')
      document.documentElement.classList.toggle('light', nextMode === 'light')
      localStorage.setItem(storageKey(next), nextMode)
      setBrandTheme(next)
      setMode(nextMode)
    } finally {
      setChangingTheme(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <ArrowLeft size={13} />
        Volver
      </button>

      {/* Dark / light mode */}
      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
          Modo
        </p>
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            {mode === 'dark'
              ? <Moon size={15} style={{ color: 'var(--accent)' }} />
              : <Sun size={15} style={{ color: 'var(--stat-icon)' }} />
            }
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {mode === 'dark' ? 'Modo oscuro' : 'Modo claro'}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {mode === 'dark' ? 'Fondo oscuro, bajo consumo visual' : 'Fondo claro, ideal para ambientes con luz'}
              </p>
            </div>
          </div>
          {/* Toggle pill */}
          <button
            onClick={toggleMode}
            role="switch"
            aria-checked={mode === 'light'}
            className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 cursor-pointer"
            style={{ backgroundColor: mode === 'light' ? 'var(--accent)' : 'var(--border)' }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full transition-transform duration-200"
              style={{
                backgroundColor: 'var(--card)',
                left: '2px',
                transform: mode === 'light' ? 'translateX(20px)' : 'translateX(0)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>
      </section>

      {/* Brand theme */}
      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
          Tema de marca
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(VALID_THEME_KEYS as readonly ThemeKey[]).map((key) => {
            const meta = THEME_META[key]
            const isActive = brandTheme === key
            const isLoading = changingTheme === key
            return (
              <button
                key={key}
                onClick={() => void handleBrandTheme(key)}
                disabled={changingTheme !== null}
                className="relative rounded-xl overflow-hidden text-left transition-all duration-150 cursor-pointer disabled:opacity-60"
                style={{
                  border: isActive
                    ? '2px solid var(--accent)'
                    : '2px solid var(--border)',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Mini preview */}
                <div
                  className="h-16 w-full flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: meta.bg }}
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: meta.accent }}
                  />
                  <div className="flex flex-col gap-1">
                    <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: meta.text, opacity: 0.7 }} />
                    <div className="h-1 w-7 rounded-full" style={{ backgroundColor: meta.text, opacity: 0.3 }} />
                  </div>
                </div>
                {/* Label */}
                <div
                  className="px-3 py-2"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                    {meta.label}
                  </p>
                  <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {meta.desc}
                  </p>
                </div>
                {/* Active check */}
                {isActive && !isLoading && (
                  <span
                    className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <Check size={11} style={{ color: 'var(--accent-foreground)' }} />
                  </span>
                )}
                {isLoading && (
                  <span
                    className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'var(--muted)' }}
                  >
                    <span
                      className="h-3 w-3 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                    />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
