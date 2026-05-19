/**
 * POST /api/me/brand-theme
 *
 * Sets the user's brand theme preference cookie (`user_brand_theme`).
 * This decouples the visual brand (eternity / govbidder) from the active
 * client/tenant, so switching to view another client's data never changes
 * the UI's visual brand.
 *
 * Body: { theme: 'eternity' | 'govbidder' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserId, UnauthorizedError } from '@/lib/auth-user'
import { VALID_THEME_KEYS, USER_THEME_COOKIE } from '@/lib/active-brand'

const Schema = z.object({
  theme: z.enum(VALID_THEME_KEYS),
})

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await requireUserId()

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
    }

    const res = NextResponse.json({ ok: true, theme: parsed.data.theme })
    res.cookies.set(USER_THEME_COOKIE, parsed.data.theme, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
    })
    return res
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[me/brand-theme/POST] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
