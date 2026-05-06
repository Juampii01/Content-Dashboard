/**
 * POST /api/auth/notify-signup
 *
 * Called fire-and-forget from the login page right after a successful
 * `supabase.auth.signUp`. Sends an admin approval email to SUPER_ADMIN_EMAIL
 * and rate-limits by IP (3/hour) to prevent abuse.
 *
 * Public route — no auth required (signup happens pre-auth).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { NotifySignupSchema } from '@/lib/schemas/auth'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { sendNewSignupNotification } from '@/lib/email'

export const runtime = 'nodejs'

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  // Rate limit is hard-enforced, runs before any parsing that could leak info.
  // Converged on `checkRateLimit` (fails-closed in prod on missing KV) — the
  // legacy `checkSignupRateLimit` had an LRU fallback that silently allowed
  // unlimited signups whenever @upstash/* couldn't load. 3 per hour per IP.
  const rl = await checkRateLimit(ip, 'signup', 3, '1 h')
  if (rl !== null && !rl.success) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: 3600 },
      {
        status: 429,
        headers: {
          'Retry-After': '3600',
        },
      }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = NotifySignupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // Swallow Resend errors — never block signup.
  await sendNewSignupNotification({
    email: parsed.data.email,
    signupAt: new Date(),
  })

  return NextResponse.json({ ok: true })
}
