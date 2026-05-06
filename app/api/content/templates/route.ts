/**
 * GET  /api/content/templates        — return all ContentTemplates
 *                                       optional ?type=reel|historia
 * POST /api/content/templates        — create a ContentTemplate
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

const CreateContentTemplateSchema = z.object({
  name:        z.string().min(1),
  type:        z.enum(['reel', 'historia']),
  status:      z.enum(['drafts', 'en-proceso', 'programado', 'publicado']).optional(),
  color:       z.string().optional(),
  category:    z.string().optional(),
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

// ─── GET /api/content/templates ───────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  try {
    const where = type ? { clientId, type } : { clientId }
    const records = await db.contentTemplate.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ templates: records.map(toContentTemplate) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content/templates/GET] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── POST /api/content/templates ──────────────────────────────────────────

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

  const parsed = CreateContentTemplateSchema.safeParse(body)
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
    const record = await db.contentTemplate.create({
      data: {
        clientId,
        createdBy: userId,
        updatedBy: userId,
        name,
        type,
        status: status ?? 'drafts',
        color: color ?? '',
        category: category ?? '',
        description: description ?? '',
      },
    })
    return NextResponse.json({ template: toContentTemplate(record) }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content/templates/POST] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
