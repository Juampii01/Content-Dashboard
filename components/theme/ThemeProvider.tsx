'use client'

/**
 * ThemeProvider — decoupled brand-theme context.
 *
 * Theme is now a USER preference, completely independent of which
 * client/tenant is active. Rules:
 *
 *  • Non-admins  → always DEFAULT_THEME_KEY ('eternity'). No choice exposed.
 *  • Admins      → read/write localStorage key 'admin_theme'. Defaults to
 *                  DEFAULT_THEME_KEY when no value stored.
 *
 * The SSR pass always renders with DEFAULT_THEME_KEY. An inline <script> in
 * <head> fixes the data-theme on first paint for admins (FOUC prevention).
 * This provider then syncs React state once the profile is loaded.
 *
 * Must be rendered INSIDE <AuthProvider> so it can call useAuth().
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { VALID_THEME_KEYS, DEFAULT_THEME_KEY, isValidThemeKey, type ThemeKey } from '@/lib/themes'
import { useAuth } from '@/components/layout/AuthProvider'

const STORAGE_KEY = 'admin_theme'

interface ThemeContextValue {
  currentTheme: ThemeKey
  availableThemes: readonly ThemeKey[]
  /** Only works for admins — no-ops for other roles */
  setTheme: (theme: ThemeKey) => void
  isAdmin: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: DEFAULT_THEME_KEY,
  availableThemes: VALID_THEME_KEYS,
  setTheme: () => {},
  isAdmin: false,
})

/** Apply theme to the DOM immediately (no re-render required). */
function applyThemeToDom(theme: ThemeKey) {
  const html = document.documentElement
  html.dataset.theme = theme
  // Restore the user's preferred light/dark mode for this theme.
  // Falls back to the theme's natural default when no preference stored.
  const storedMode = localStorage.getItem(`eternity_theme:${theme}`)
  const mode =
    storedMode === 'light' ? 'light'
    : storedMode === 'dark'  ? 'dark'
    : theme === 'govbidder'  ? 'light'  // govbidder default = light
    : 'dark'                            // eternity default = dark
  html.classList.toggle('dark',  mode === 'dark')
  html.classList.toggle('light', mode === 'light')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(DEFAULT_THEME_KEY)

  // Once we know the user's role, apply their stored preference (admins only).
  // Priority: localStorage (instant) → profile.themeKey from /api/me (source of truth).
  useEffect(() => {
    if (!isAdmin) {
      applyThemeToDom(DEFAULT_THEME_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentTheme(DEFAULT_THEME_KEY)
      return
    }
    // Apply localStorage immediately to avoid FOUC.
    const stored = localStorage.getItem(STORAGE_KEY)
    const localTheme = isValidThemeKey(stored) ? stored : DEFAULT_THEME_KEY
    applyThemeToDom(localTheme)
    setCurrentTheme(localTheme)

    // Then sync from DB (profile.themeKey) as source of truth.
    fetch('/api/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        const dbTheme = isValidThemeKey(data.themeKey) ? data.themeKey : null
        if (dbTheme && dbTheme !== localTheme) {
          localStorage.setItem(STORAGE_KEY, dbTheme)
          applyThemeToDom(dbTheme)
          setCurrentTheme(dbTheme)
        }
      })
      .catch(() => { /* ignore — keep localStorage value */ })
  }, [isAdmin])

  const setTheme = useCallback(
    (theme: ThemeKey) => {
      if (!isAdmin) return
      localStorage.setItem(STORAGE_KEY, theme)
      applyThemeToDom(theme)
      setCurrentTheme(theme)
    },
    [isAdmin],
  )

  return (
    <ThemeContext.Provider
      value={{ currentTheme, availableThemes: VALID_THEME_KEYS, setTheme, isAdmin }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
