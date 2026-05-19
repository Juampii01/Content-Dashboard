'use client'

/**
 * ThemeInit — seeds the `user_brand_theme` cookie on the user's first visit.
 *
 * Runs once on mount in the browser. If the cookie is not yet set, it reads
 * the current brand theme from `<html data-theme="...">` (which was resolved
 * server-side from Client.themeKey on first load) and persists it as a
 * 1-year browser cookie.
 *
 * From that point on, `getActiveThemeKey()` reads the cookie — the brand theme
 * stays constant even when the admin switches to view a different client's data.
 */

const COOKIE_NAME = 'user_brand_theme'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function ThemeInit() {
  // We intentionally DON'T use useEffect with dependencies — this must run
  // exactly once per session to seed the cookie without causing re-renders.
  if (typeof window !== 'undefined') {
    const alreadySet = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith(`${COOKIE_NAME}=`))

    if (!alreadySet) {
      const theme = document.documentElement.dataset.theme ?? 'eternity'
      document.cookie = `${COOKIE_NAME}=${theme}; max-age=${ONE_YEAR_SECONDS}; path=/; SameSite=Lax`
    }
  }
  return null
}
