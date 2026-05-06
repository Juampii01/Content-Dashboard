'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Sun, Moon } from 'lucide-react'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'

const themeSchema = z.enum(['dark', 'light'])

export function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('eternity_theme', themeSchema, 'dark')
  const [spinning, setSpinning] = useState(false)

  // Apply stored theme on mount (layout.tsx hardcodes 'dark' as SSR default)
  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('dark', theme === 'dark')
    html.classList.toggle('light', theme === 'light')
  }, [theme])

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = theme === 'dark' ? 'light' : 'dark'
    const html = document.documentElement

    const apply = () => {
      html.classList.toggle('dark', next === 'dark')
      html.classList.toggle('light', next === 'light')
      setTheme(next)
    }

    // Premium swap: View Transitions API with circular reveal from click point.
    // Falls back to a global crossfade for browsers without VT support (Firefox <pending>).
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const supportsVT = 'startViewTransition' in document

    if (supportsVT && !prefersReduced) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top  + rect.height / 2
      html.style.setProperty('--theme-x', `${x}px`)
      html.style.setProperty('--theme-y', `${y}px`)
      // Cast: TS lib may not yet include startViewTransition
      ;(document as unknown as { startViewTransition: (cb: () => void) => void })
        .startViewTransition(apply)
    } else {
      html.classList.add('theme-transitioning')
      apply()
      window.setTimeout(() => html.classList.remove('theme-transitioning'), 500)
    }

    // Spin icon
    setSpinning(true)
    window.setTimeout(() => setSpinning(false), 400)
  }

  const isDark = theme === 'dark'
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
          ? <Sun  size={12} style={{ color: '#B08A4A' }} />
          : <Moon size={12} style={{ color: 'var(--accent)' }} />
        }
      </span>
      {isDark ? 'Modo claro' : 'Modo oscuro'}
    </button>
  )
}
