/**
 * POST /api/admin/users/create — admin creates a new user.
 * ADMIN only.
 *
 * Flow:
 * 1. requireAdmin
 * 2. Validate email + role + optional clientId
 * 3. If clientId provided → verify it exists in `clients`
 * 4. createUser in Supabase Auth (email_confirm: true)
 * 5. Upsert profile with role + clientId
 * 6. If profile upsert fails → rollback deleteUser
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import { adminAuthOr401 } from '@/lib/admin/guard'
import { createAdminClient } from '@/lib/supabase/admin'

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'team', 'setter', 'client']).default('client'),
  clientId: z.string().cuid().nullable().optional(),
  displayName: z.string().trim().max(64).nullable().optional(),
})

function generateTempPassword(): string {
  // Use cryptographically secure random bytes instead of Math.random()
  const base = randomBytes(12).toString('base64url')
  return base + '!'
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', issues: parsed.error.issues }, { status: 400 })
  }

  const { email, role, clientId, displayName } = parsed.data
  const password = parsed.data.password ?? generateTempPassword()
  const isTempPassword = !parsed.data.password

  // Verify clientId exists before touching auth.users
  if (clientId) {
    const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true } })
    if (!client) {
      return NextResponse.json({ error: 'CLIENT_NOT_FOUND' }, { status: 404 })
    }
  }

  const supabase = createAdminClient()

  // Create Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    const msg = authError?.message ?? 'Unknown error'
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return NextResponse.json({ error: 'EMAIL_ALREADY_EXISTS' }, { status: 409 })
    }
    console.error('[admin/users/create] createUser failed:', msg)
    return NextResponse.json({ error: 'CREATE_USER_FAILED', detail: msg }, { status: 500 })
  }

  const userId = authData.user.id

  try {
    await db.profile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        role: role.toUpperCase() as 'ADMIN' | 'TEAM' | 'SETTER' | 'CLIENT',
        clientId: clientId ?? null,
        displayName: displayName ?? null,
      },
      update: {
        role: role.toUpperCase() as 'ADMIN' | 'TEAM' | 'SETTER' | 'CLIENT',
        clientId: clientId ?? null,
        displayName: displayName ?? null,
      },
    })
  } catch (err) {
    // Rollback: delete the auth user so we don't leave orphans
    await supabase.auth.admin.deleteUser(userId).catch(() => {})
    console.error('[admin/users/create] profile upsert failed — rolled back auth user:', err)
    return NextResponse.json({ error: 'PROFILE_UPSERT_FAILED' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    userId,
    email,
    role,
    ...(isTempPassword ? { tempPassword: password } : {}),
  })
}
