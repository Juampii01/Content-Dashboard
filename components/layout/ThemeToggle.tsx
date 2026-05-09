'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

type Mode = 'dark' | 'light'

function readThemeKey(): string {
  if (typeof document === 'undefined') return 'eternity'
  return document.documentElement.dataset.theme || 'eternity'
}

function readSsrMode(): Mode {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

function storageKey(themeKey: string): string {
  return `eternity_theme:${themeKey}`
}

export function ThemeToggle() {
  // SSR-safe initial state. The real value resolves in the mount effect below
  // (which respects the user's stored preference per active tenant theme).
  const [mode, setMode] = useState<Mode>('dark')
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    const themeKey = readThemeKey()
    const stored = localStorage.getItem(storageKey(themeKey))
    const html = document.documentElement
    let next: Mode
    if (stored === 'dark' || stored === 'light') {
      html.classList.toggle('dark', stored === 'dark')
      html.classList.toggle('light', stored === 'light')
      next = stored
    } else {
      // No per-tenant preference yet — honor the SSR default and persist it
      // so future switches between this tenant's dark/light feel sticky.
      next = readSsrMode()
      localStorage.setItem(storageKey(themeKey), next)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(next)
  }, [])

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark'
    const html = document.documentElement
    const themeKey = readThemeKey()

    const apply = () => {
      html.classList.toggle('dark', next === 'dark')
      html.classList.toggle('light', next === 'light')
      localStorage.setItem(storageKey(themeKey), next)
      setMode(next)
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const supportsVT = 'startViewTransition' in document

    if (supportsVT && !prefersReduced) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      html.style.setProperty('--theme-x', `${x}px`)
      html.style.setProperty('--theme-y', `${y}px`)
      ;(document as unknown as { startViewTransition: (cb: () => void) => void })
        .startViewTransition(apply)
    } else {
      html.classList.add('theme-transitioning')
      apply()
      window.setTimeout(() => html.classList.remove('theme-transitioning'), 500)
    }

    setSpinning(true)
    window.setTimeout(() => setSpinning(false), 400)
  }

  const isDark = mode === 'dark'
  const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80 cursor-pointer"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        color: 'var(--muted-foreground)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          transition: 'transform 350ms cubic-bezier(0.34,1.56,0.64,1)',
          transform: spinning ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      >
        {isDark
          ? <Sun  size={12} style={{ color: 'var(--stat-icon)' }} />
          : <Moon size={12} style={{ color: 'var(--accent)' }} />
        }
      </span>
      {isDark ? 'Modo claro' : 'Modo oscuro'}
    </button>
  )
}
