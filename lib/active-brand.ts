import 'server-only'

import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { ACTIVE_CLIENT_COOKIE } from '@/lib/auth-user'
import { DEFAULT_THEME_KEY, isValidThemeKey, type ThemeKey } from '@/lib/themes'

// Re-export the registry so callers don't need a second import for the
// common case of "give me the theme + check if it's valid".
export type { ThemeKey } from '@/lib/themes'
export { VALID_THEME_KEYS, DEFAULT_THEME_KEY, isValidThemeKey } from '@/lib/themes'

/**
 * Resolve the theme to apply to the current request.
 *
 * Reads the `activeClientId` cookie, looks up `Client.themeKey`, and
 * coerces unknown values to `DEFAULT_THEME_KEY`. Any error (no cookie,
 * client deleted, DB hiccup) falls back to `DEFAULT_THEME_KEY` so the
 * app still renders.
 *
 * Server-only by design — uses `cookies()` and `db`. Importing from a
 * client component will fail at build time thanks to `server-only`.
 *
 * Extracted from `app/layout.tsx` so the layout file stays focused on
 * the bootstrap flow and the theme logic is unit-testable in isolation.
 */
export async function getActiveThemeKey(): Promise<ThemeKey> {
  try {
    const cookieStore = await cookies()
    const activeClientId = cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value
    if (!activeClientId) return DEFAULT_THEME_KEY

    const client = await db.client.findUnique({
      where: { id: activeClientId },
      select: { themeKey: true },
    })
    if (!client) return DEFAULT_THEME_KEY

    return isValidThemeKey(client.themeKey) ? client.themeKey : DEFAULT_THEME_KEY
  } catch {
    return DEFAULT_THEME_KEY
  }
}
