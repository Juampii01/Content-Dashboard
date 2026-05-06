/**
 * PATCH  /api/ideas/[id] — update idea
 * DELETE /api/ideas/[id] — delete idea
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

const PatchIdeaSchema = z.object({
  title:        z.string().min(1).max(300).optional(),
  format:       z.enum(['reel', 'carrusel', 'historia', 'foto', 'video-largo', 'meme']).optional(),
  notes:        z.string().optional(),
  referenceUrl: z.string().url().optional().or(z.literal('')),
})

type RouteContext = { params: Promise<{ id: string }> }

// ─── PATCH /api/ideas/[id] ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { userId, clientId } = auth

  const { id } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchIdeaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const result = await db.idea.updateMany({
      where: { id, clientId },
      data: { ...parsed.data, updatedBy: userId },
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }
    const idea = await db.idea.findUnique({ where: { id } })
    return NextResponse.json({ idea })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ideas/[id] PATCH] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── DELETE /api/ideas/[id] ───────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth

  const { id } = await ctx.params

  try {
    const result = await db.idea.deleteMany({ where: { id, clientId } })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ideas/[id] DELETE] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
