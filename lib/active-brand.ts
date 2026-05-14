import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { DEFAULT_THEME_KEY, isValidThemeKey, type ThemeKey } from '@/lib/themes'

export type { ThemeKey } from '@/lib/themes'
export { VALID_THEME_KEYS, DEFAULT_THEME_KEY, isValidThemeKey } from '@/lib/themes'

/**
 * Resolve the theme to apply to the current request.
 *
 * Reads the active user's profile.clientId, looks up Client.themeKey, and
 * coerces unknown values to DEFAULT_THEME_KEY. Any error (no session, no
 * client assigned, DB hiccup) falls back to DEFAULT_THEME_KEY so the app
 * still renders.
 */
export async function getActiveThemeKey(): Promise<ThemeKey> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return DEFAULT_THEME_KEY

    const profile = await db.profile.findUnique({
      where: { id: user.id },
      select: { clientId: true },
    })
    if (!profile?.clientId) return DEFAULT_THEME_KEY

    const client = await db.client.findUnique({
      where: { id: profile.clientId },
      select: { themeKey: true },
    })
    if (!client) return DEFAULT_THEME_KEY

    return isValidThemeKey(client.themeKey) ? client.themeKey : DEFAULT_THEME_KEY
  } catch {
    return DEFAULT_THEME_KEY
  }
}
