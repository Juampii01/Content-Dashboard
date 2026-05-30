/**
 * PATCH  /api/guiones/tabs/[tabId] — update tab (name, emoji, order)
 * DELETE /api/guiones/tabs/[tabId] — delete tab (cascades to items via Prisma)
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

const PatchTabSchema = z.object({
  name:  z.string().min(1).max(100).optional(),
  emoji: z.string().max(10).optional(),
  order: z.number().int().optional(),
})

type RouteContext = { params: Promise<{ tabId: string }> }

// ─── PATCH /api/guiones/tabs/[tabId] ─────────────────────────────────────────

export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { userId, clientId } = auth

  const { tabId } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchTabSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', ...(process.env.NODE_ENV !== 'production' ? { issues: parsed.error.flatten() } : {}) },
      { status: 400 },
    )
  }

  try {
    const result = await db.guionTab.updateMany({
      where: { id: tabId, clientId },
      data: { ...parsed.data, updatedBy: userId },
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Tab not found' }, { status: 404 })
    }
    const tab = await db.guionTab.findUnique({
      where: { id: tabId },
      include: { items: { orderBy: { order: 'asc' } } },
    })
    return NextResponse.json({ tab })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[guiones/tabs/[tabId] PATCH] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── DELETE /api/guiones/tabs/[tabId] ────────────────────────────────────────

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth

  const { tabId } = await ctx.params

  try {
    const result = await db.guionTab.deleteMany({ where: { id: tabId, clientId } })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Tab not found' }, { status: 404 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[guiones/tabs/[tabId] DELETE] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
