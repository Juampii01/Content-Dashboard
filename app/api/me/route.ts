/**
 * /api/me — current user profile.
 * GET: payload (role, email, displayName, avatarUrl, clientId, clientName)
 * PATCH: update displayName and/or avatarUrl
 */
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { db as prisma } from '@/lib/db'
import { requireProfile, UnauthorizedError } from '@/lib/auth-user'

export async function GET(): Promise<NextResponse> {
  try {
    const { userId, role, profile } = await requireProfile()
    const clientName = profile.clientId
      ? (await prisma.client.findUnique({ where: { id: profile.clientId }, select: { name: true } }))?.name ?? null
      : null
    return NextResponse.json({
      userId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      role: role.toLowerCase(),
      clientId: profile.clientId,
      clientName,
      themeKey: profile.themeKey ?? 'eternity',
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[me/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const PatchSchema = z.object({
  displayName: z.string().trim().min(1).max(64).nullable().optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
})

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await requireProfile()
    const body = await req.json().catch(() => null)
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY', issues: parsed.error.issues }, { status: 400 })
    }
    const data: { displayName?: string | null; avatarUrl?: string | null } = {}
    if (parsed.data.displayName !== undefined) data.displayName = parsed.data.displayName
    if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true })
    }
    const updated = await prisma.profile.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, displayName: true, avatarUrl: true, role: true },
    })
    return NextResponse.json({ ok: true, profile: updated })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[me/PATCH] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
