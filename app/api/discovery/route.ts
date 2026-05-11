/**
 * /api/discovery — single answers blob, SUPER_ADMIN only.
 *
 *   GET   → loads the answers (auto-creates an empty row on first call).
 *   PATCH → updates a single answer. Body: { questionId, answer }.
 *
 * The cuestionario itself (40 questions, 9 blocks) is fixed in code at
 * `lib/discovery/questions.ts`. This table only stores responses.
 */
import { NextResponse, type NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import {
  requireProfile,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'
import { PatchDiscoverySchema } from '@/lib/schemas/discovery'

async function requireOwner() {
  const { userId, globalRole } = await requireProfile()
  if (globalRole !== 'SUPER_ADMIN') throw new ForbiddenError()
  return userId
}

async function getOrCreateRow() {
  const existing = await db.discoveryAnswers.findFirst()
  if (existing) return existing
  return db.discoveryAnswers.create({ data: {} })
}

export async function GET(): Promise<NextResponse> {
  try {
    await requireOwner()
    const row = await getOrCreateRow()
    return NextResponse.json({
      answers: (row.answers as Record<string, string>) ?? {},
      updatedAt: row.updatedAt.toISOString(),
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[discovery/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    await requireOwner()
    const body = await req.json().catch(() => null)
    const parsed = PatchDiscoverySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_BODY', issues: parsed.error.issues },
        { status: 400 },
      )
    }
    const { questionId, answer } = parsed.data
    const row = await getOrCreateRow()
    const current = (row.answers as Record<string, string>) ?? {}
    const next = { ...current, [questionId]: answer }
    const updated = await db.discoveryAnswers.update({
      where: { id: row.id },
      data: { answers: next as Prisma.InputJsonValue },
      select: { updatedAt: true },
    })
    return NextResponse.json({
      ok: true,
      questionId,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[discovery/PATCH] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
