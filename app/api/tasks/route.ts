/**
 * GET  /api/tasks — return all tasks sorted by columnId, order
 * POST /api/tasks — create a new task
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

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  labelText: z.string().optional(),
  labelColor: z.string().optional(),
  columnId: z.string().optional(),
  order: z.number().int().optional(),
})

// ─── GET /api/tasks ────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth
  try {
    const tasks = await db.task.findMany({
      where: { clientId },
      orderBy: [{ columnId: 'asc' }, { order: 'asc' }],
    })
    return NextResponse.json({ tasks })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[tasks/GET] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── POST /api/tasks ───────────────────────────────────────────────────────

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

  const parsed = CreateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: parsed.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 },
    )
  }

  const { title, description, dueDate, labelText, labelColor, columnId, order } = parsed.data

  try {
    const resolvedColumnId = columnId ?? 'por-hacer'

    const task = await db.$transaction(async (tx) => {
      // Determine order atomically to avoid TOCTOU race when two requests
      // read the same count and assign duplicate order values.
      const taskOrder = order !== undefined
        ? order
        : await tx.task.count({ where: { clientId, columnId: resolvedColumnId } })

      return tx.task.create({
        data: {
          clientId,
          createdBy: userId,
          updatedBy: userId,
          title,
          description: description ?? '',
          dueDate: dueDate ? new Date(dueDate) : null,
          labelText: labelText ?? '',
          labelColor: labelColor ?? '',
          columnId: resolvedColumnId,
          order: taskOrder,
        },
      })
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[tasks/POST] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
