/**
 * Per-client theme registry.
 *
 * The active theme is persisted on `Client.themeKey` and applied at the
 * <html data-theme="..."> level by `app/layout.tsx`. Two themes today:
 *  - `eternity`  → DARK by default, eternity brand red (#8E1F2F)
 *  - `govbidder` → LIGHT by default, GovBidder brand
 *
 * This module is intentionally pure: no DB, no `cookies()`, no `next/*`
 * imports. It can be imported from server components, client components,
 * and tests alike. The DB lookup lives in `lib/active-brand.ts` (server-only).
 */

export const VALID_THEME_KEYS = ['eternity', 'govbidder'] as const
export type ThemeKey = (typeof VALID_THEME_KEYS)[number]

export const DEFAULT_THEME_KEY: ThemeKey = 'eternity'

export function isValidThemeKey(key: unknown): key is ThemeKey {
  return typeof key === 'string' && (VALID_THEME_KEYS as readonly string[]).includes(key)
}
