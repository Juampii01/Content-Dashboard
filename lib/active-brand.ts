import 'server-only'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { DEFAULT_THEME_KEY, isValidThemeKey, type ThemeKey } from '@/lib/themes'

export type { ThemeKey } from '@/lib/themes'
export { VALID_THEME_KEYS, DEFAULT_THEME_KEY, isValidThemeKey } from '@/lib/themes'

/**
 * The cookie name where the user's brand theme preference is stored.
 * This is intentionally separate from the client/tenant selection so that
 * switching to view a different client's data does NOT change the visual theme.
 *
 * The cookie is set client-side by <ThemeInit /> on the user's first visit
 * (seeded from Client.themeKey for backwards compat), and can later be
 * updated via POST /api/me/brand-theme.
 */
export const USER_THEME_COOKIE = 'user_brand_theme'

/**
 * Resolve the brand theme key for the current request.
 *
 * Priority:
 * 1. `user_brand_theme` cookie — user's own preference (set on first visit,
 *    persists independently of which client/tenant is active). This ensures
 *    the visual brand never changes when an admin switches to view another
 *    client's data.
 * 2. Client.themeKey — fallback for the very first page load before the
 *    cookie has been seeded client-side by <ThemeInit />.
 * 3. DEFAULT_THEME_KEY ('eternity') — final fallback.
 */
export async function getActiveThemeKey(): Promise<ThemeKey> {
  try {
    // ── 1. User preference cookie (stable across client switches) ──────────
    const jar = await cookies()
    const cookiePref = jar.get(USER_THEME_COOKIE)?.value
    if (isValidThemeKey(cookiePref)) return cookiePref

    // ── 2. Fallback: derive from the user's OWN client.themeKey ───────────
    //    (only used before <ThemeInit /> seeds the cookie on first visit)
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
