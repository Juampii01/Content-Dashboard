/**
 * GET  /api/ideas — list all ideas sorted by createdAt desc
 * POST /api/ideas — create a new idea
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

const CreateIdeaSchema = z.object({
  title:        z.string().min(1).max(300),
  format:       z.enum(['reel', 'carrusel', 'historia', 'foto', 'video-largo', 'meme']).optional(),
  notes:        z.string().optional(),
  referenceUrl: z.string().url().optional().or(z.literal('')),
})

// ─── GET /api/ideas ───────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth
  try {
    const ideas = await db.idea.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ ideas })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ideas GET] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── POST /api/ideas ──────────────────────────────────────────────────────────

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

  const parsed = CreateIdeaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const { title, format, notes, referenceUrl } = parsed.data
    const idea = await db.idea.create({
      data: {
        clientId,
        createdBy: userId,
        updatedBy: userId,
        title,
        format: format ?? '',
        notes: notes ?? '',
        referenceUrl: referenceUrl ?? '',
      },
    })
    return NextResponse.json({ idea }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ideas POST] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
