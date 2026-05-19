/**
 * PATCH /api/tasks/reorder
 *
 * Batch-updates the columnId + order of multiple tasks in a single request.
 * Called after every drag-end so we only fire 1 network request instead of N.
 *
 * Body: { tasks: Array<{ id: string; columnId: string; order: number }> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

async function authOr401(): Promise<{ userId: string; clientId: string } | NextResponse> {
  try { return await requireActiveClient() } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError)    return NextResponse.json({ error: 'FORBIDDEN' },    { status: 403 })
    throw err
  }
}

const ReorderSchema = z.object({
  tasks: z
    .array(
      z.object({
        id:       z.string().min(1),
        columnId: z.string().min(1),
        order:    z.number().int().min(0),
      }),
    )
    .min(1)
    .max(200), // sanity cap
})

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ReorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: parsed.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 },
    )
  }

  try {
    // Execute all updates in parallel.
    // Each update is scoped to clientId to prevent cross-tenant writes.
    await Promise.all(
      parsed.data.tasks.map((t) =>
        db.task.updateMany({
          where: { id: t.id, clientId },
          data:  { columnId: t.columnId, order: t.order },
        }),
      ),
    )
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[tasks/reorder PATCH] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
