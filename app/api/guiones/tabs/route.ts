/**
 * GET  /api/guiones/tabs          — list tabs with items, optional ?type=reel|historia
 * POST /api/guiones/tabs          — create a new tab
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

async function authOr401(): Promise<{ userId: string; clientId: string } | NextResponse> {
  try { return await requireActiveClient() } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }
}

const CreateTabSchema = z.object({
  name:  z.string().min(1).max(100),
  type:  z.enum(['reel', 'historia']),
  emoji: z.string().max(10).optional(),
  order: z.number().int().optional(),
})

// ─── GET /api/guiones/tabs ────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth
  try {
    const type = req.nextUrl.searchParams.get('type')

    const tabs = await db.guionTab.findMany({
      where: type ? { clientId, type } : { clientId },
      orderBy: { order: 'asc' },
      include: {
        items: { orderBy: { order: 'asc' } },
      },
    })

    return NextResponse.json({ tabs })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[guiones/tabs GET] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── POST /api/guiones/tabs ───────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { userId, clientId } = auth
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateTabSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', ...(process.env.NODE_ENV !== 'production' ? { issues: parsed.error.flatten() } : {}) },
      { status: 400 },
    )
  }

  try {
    const { name, type, emoji, order } = parsed.data
    const tab = await db.guionTab.create({
      data: {
        clientId,
        createdBy: userId,
        updatedBy: userId,
        name,
        type,
        emoji: emoji ?? '',
        order: order ?? 0,
      },
      include: { items: true },
    })
    return NextResponse.json({ tab }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[guiones/tabs POST] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
