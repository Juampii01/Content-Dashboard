import 'server-only'

import { DEFAULT_THEME_KEY, type ThemeKey } from '@/lib/themes'

export type { ThemeKey } from '@/lib/themes'
export { VALID_THEME_KEYS, DEFAULT_THEME_KEY, isValidThemeKey } from '@/lib/themes'

/**
 * Resolve the brand theme for SSR.
 *
 * The theme is now a pure client-side preference stored in localStorage
 * under the key 'admin_theme' (admins only). Non-admins always see
 * DEFAULT_THEME_KEY.
 *
 * For SSR we always return DEFAULT_THEME_KEY — the correct theme is
 * applied client-side by:
 *   1. An inline <script> in <head> (FOUC prevention, runs before paint).
 *   2. <ThemeProvider> inside <AuthProvider> (syncs React state once loaded).
 *
 * Client.themeKey in the DB is intentionally ignored for UI rendering.
 * It remains in the schema for future use (e.g. email templates, exports).
 */
export async function getActiveThemeKey(): Promise<ThemeKey> {
  return DEFAULT_THEME_KEY
}
