/**
 * GET  /api/content        — return all ContentPieces sorted by order
 *                            optional ?type=reel|historia
 * POST /api/content        — create a ContentPiece
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

const CreateContentPieceSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  type:        z.enum(['reel', 'historia']),
  status:      z.enum(['drafts', 'en-proceso', 'programado', 'publicado']),
  color:       z.string().optional(),
  category:    z.string().optional(),
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

// ─── GET /api/content ──────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  try {
    const where = type ? { clientId, type } : { clientId }
    const records = await db.contentPiece.findMany({
      where,
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ items: records.map(toContentPiece) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content/GET] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── POST /api/content ─────────────────────────────────────────────────────

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

  const parsed = CreateContentPieceSchema.safeParse(body)
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
    let itemOrder = order ?? 0
    if (order === undefined) {
      const count = await db.contentPiece.count({ where: { clientId, status } })
      itemOrder = count
    }

    const record = await db.contentPiece.create({
      data: {
        clientId,
        createdBy: userId,
        updatedBy: userId,
        title,
        description: description ?? '',
        type,
        status,
        color: color ?? '',
        category: category ?? '',
        date: date ? new Date(date) : null,
        endDate: endDate ? new Date(endDate) : null,
        format: format ?? '',
        platform: platform ?? '',
        emoji: emoji ?? '',
        order: itemOrder,
      },
    })

    return NextResponse.json({ item: toContentPiece(record) }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content/POST] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
