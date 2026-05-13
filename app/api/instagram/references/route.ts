/**
 * GET  /api/instagram/references — list client's content references (max 100)
 * POST /api/instagram/references — create a reference
 * DELETE /api/instagram/references — delete a reference by id (body: { id })
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { CreateReferenceSchema, DeleteReferenceSchema } from '@/lib/schemas/references'

function authError(err: unknown) {
  if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (err instanceof ForbiddenError)   return NextResponse.json({ error: 'FORBIDDEN' },     { status: 403 })
  throw err
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  let clientId: string
  try { ({ clientId } = await requireActiveClient()) } catch (e) { return authError(e) }

  const refs = await db.contentReference.findMany({
    where:   { clientId },
    orderBy: { createdAt: 'desc' },
    take:    100,
  })

  return NextResponse.json({ references: refs })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let userId: string, clientId: string
  try { ({ userId, clientId } = await requireActiveClient()) } catch (e) { return authError(e) }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateReferenceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.flatten() }, { status: 400 })
  }

  const { title, category, tags, url, platform, notes } = parsed.data

  const ref = await db.contentReference.create({
    data: { clientId, createdBy: userId, updatedBy: userId, title, category, tags, url, platform, notes },
  })

  return NextResponse.json({ reference: ref }, { status: 201 })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let userId: string, clientId: string
  try { ({ userId, clientId } = await requireActiveClient()) } catch (e) { return authError(e) }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = DeleteReferenceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const existing = await db.contentReference.findFirst({
    where: { id: parsed.data.id, clientId },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.contentReference.delete({ where: { id: parsed.data.id } })
  void userId // satisfies lint
  return NextResponse.json({ ok: true })
}
