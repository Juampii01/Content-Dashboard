/**
 * GET /api/admin/users — list all users (Profile + client info).
 * ADMIN only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adminAuthOr401, getClientIp } from '@/lib/admin/guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/utils/ratelimit'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth

  const rl = await checkRateLimit(getClientIp(req), 'admin-users', 60, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const profiles = await db.profile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, slug: true } },
      },
    })

    let authEmailById = new Map<string, string | undefined>()
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      if (!error && data) {
        authEmailById = new Map(data.users.map((u) => [u.id, u.email ?? undefined]))
      }
    } catch (err) {
      console.warn('[admin/users] auth.users lookup failed:', err)
    }

    const users = profiles.map((p) => ({
      id: p.id,
      email: authEmailById.get(p.id) ?? p.email ?? null,
      displayName: p.displayName,
      role: p.role,
      clientId: p.clientId,
      clientName: p.client?.name ?? null,
      clientSlug: p.client?.slug ?? null,
      themeKey: p.themeKey,
      createdAt: p.createdAt,
    }))

    return NextResponse.json({ users })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/users/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
