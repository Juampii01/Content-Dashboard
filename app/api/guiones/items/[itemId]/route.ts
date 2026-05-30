/**
 * PATCH  /api/guiones/items/[itemId] — update item (title, content, order)
 * DELETE /api/guiones/items/[itemId] — delete item
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

const PatchItemSchema = z.object({
  title:   z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  order:   z.number().int().optional(),
})

type RouteContext = { params: Promise<{ itemId: string }> }

// ─── PATCH /api/guiones/items/[itemId] ───────────────────────────────────────

export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { userId, clientId } = auth

  const { itemId } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', ...(process.env.NODE_ENV !== 'production' ? { issues: parsed.error.flatten() } : {}) },
      { status: 400 },
    )
  }

  try {
    const result = await db.guionItem.updateMany({
      where: { id: itemId, clientId },
      data: { ...parsed.data, updatedBy: userId },
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    const item = await db.guionItem.findUnique({ where: { id: itemId } })
    return NextResponse.json({ item })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[guiones/items/[itemId] PATCH] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── DELETE /api/guiones/items/[itemId] ──────────────────────────────────────

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth

  const { itemId } = await ctx.params

  try {
    const result = await db.guionItem.deleteMany({ where: { id: itemId, clientId } })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[guiones/items/[itemId] DELETE] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
