/**
 * PATCH  /api/content/templates/[id] — update a ContentTemplate
 * DELETE /api/content/templates/[id] — delete a ContentTemplate
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

const UpdateContentTemplateSchema = z.object({
  name:        z.string().min(1).optional(),
  type:        z.enum(['reel', 'historia']).optional(),
  status:      z.enum(['drafts', 'en-proceso', 'programado', 'publicado']).optional(),
  color:       z.string().optional(),
  category:    z.string().optional().nullable(),
  description: z.string().optional(),
})

// ─── Helper: convert DB record to ContentTemplate shape ───────────────────

function toContentTemplate(record: {
  id: string
  name: string
  type: string
  status: string
  color: string
  category: string
  description: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id:          record.id,
    name:        record.name,
    type:        record.type,
    status:      record.status,
    color:       record.color,
    category:    record.category || undefined,
    description: record.description || undefined,
    createdAt:   record.createdAt.toISOString(),
    updatedAt:   record.updatedAt.toISOString(),
  }
}

// ─── PATCH /api/content/templates/[id] ────────────────────────────────────

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

  const parsed = UpdateContentTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: parsed.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 },
    )
  }

  const { name, type, status, color, category, description } = parsed.data

  try {
    const data = {
      ...(name        !== undefined && { name }),
      ...(type        !== undefined && { type }),
      ...(status      !== undefined && { status }),
      ...(color       !== undefined && { color }),
      ...(category    !== undefined && { category: category ?? '' }),
      ...(description !== undefined && { description }),
      updatedBy: userId,
    }

    // Scope update to both id AND clientId to prevent cross-tenant writes.
    const result = await db.contentTemplate.updateMany({
      where: { id, clientId },
      data,
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const record = await db.contentTemplate.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ template: toContentTemplate(record) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content/templates/[id]/PATCH] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── DELETE /api/content/templates/[id] ───────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth

  const { id } = await params

  try {
    const result = await db.contentTemplate.deleteMany({ where: { id, clientId } })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content/templates/[id]/DELETE] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
