/**
 * PATCH  /api/content/[id] — update a ContentPiece
 * DELETE /api/content/[id] — delete a ContentPiece
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

// ─── Schemas ───────────────────────────────────────────────────────────────

const UpdateContentPieceSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional(),
  type:        z.enum(['reel', 'historia']).optional(),
  status:      z.enum(['drafts', 'en-proceso', 'programado', 'publicado']).optional(),
  color:       z.string().optional(),
  category:    z.string().optional().nullable(),
  date:        z.string().optional().nullable(),
  endDate:     z.string().optional().nullable(),
  format:      z.string().optional(),
  platform:    z.string().optional(),
  emoji:       z.string().optional(),
  order:       z.number().int().optional(),
})

// ─── Helper: convert DB record to ContentPiece shape ──────────────────────

function toContentPiece(record: {
  id: string
  title: string
  description: string
  type: string
  status: string
  color: string
  category: string
  date: Date | null
  endDate: Date | null
  format: string
  platform: string
  emoji: string
  order: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id:          record.id,
    title:       record.title,
    description: record.description,
    type:        record.type,
    status:      record.status,
    color:       record.color,
    category:    record.category || undefined,
    date:        record.date ? record.date.toISOString().split('T')[0] : undefined,
    endDate:     record.endDate ? record.endDate.toISOString().split('T')[0] : undefined,
    format:      record.format || undefined,
    platform:    record.platform || undefined,
    emoji:       record.emoji || undefined,
    order:       record.order,
    createdAt:   record.createdAt.toISOString(),
    updatedAt:   record.updatedAt.toISOString(),
  }
}

// ─── PATCH /api/content/[id] ───────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { userId, clientId } = auth

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = UpdateContentPieceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: parsed.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 },
    )
  }

  const { title, description, type, status, color, category, date, endDate, format, platform, emoji, order } = parsed.data

  try {
    const data = {
      ...(title !== undefined       && { title }),
      ...(description !== undefined && { description }),
      ...(type !== undefined        && { type }),
      ...(status !== undefined      && { status }),
      ...(color !== undefined       && { color }),
      ...(category !== undefined    && { category: category ?? '' }),
      ...(date !== undefined        && { date: date ? new Date(date) : null }),
      ...(endDate !== undefined     && { endDate: endDate ? new Date(endDate) : null }),
      ...(format !== undefined      && { format }),
      ...(platform !== undefined    && { platform }),
      ...(emoji !== undefined       && { emoji }),
      ...(order !== undefined       && { order }),
      updatedBy: userId,
    }

    // Scope update to both id AND clientId to prevent cross-tenant writes.
    const result = await db.contentPiece.updateMany({
      where: { id, clientId },
      data,
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const record = await db.contentPiece.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ item: toContentPiece(record) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content/[id]/PATCH] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── DELETE /api/content/[id] ──────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth

  const { id } = await params

  try {
    const result = await db.contentPiece.deleteMany({ where: { id, clientId } })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content/[id]/DELETE] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
