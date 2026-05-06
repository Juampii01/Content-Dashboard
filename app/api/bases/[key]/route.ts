import { NextResponse } from 'next/server'
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

const PutBodySchema = z.object({
  content: z.string().optional(),
  items:   z.array(z.string()).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth
  try {
    const { key } = await params
    const base = await db.businessBase.findUnique({ where: { clientId_key: { clientId, key } } })
    return NextResponse.json(base ?? null)
  } catch (err) {
    console.error('[GET /api/bases/[key]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { userId, clientId } = auth
  try {
    const { key } = await params
    const json = await request.json()
    const parsed = PutBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const body = parsed.data
    const data = {
      ...(body.content !== undefined && { content: body.content }),
      ...(body.items   !== undefined && { items:   JSON.stringify(body.items) }),
    }

    const base = await db.businessBase.upsert({
      where:  { clientId_key: { clientId, key } },
      update: { ...data, updatedBy: userId },
      create: { clientId, createdBy: userId, updatedBy: userId, key, ...data },
    })

    return NextResponse.json(base)
  } catch (err) {
    console.error('[PUT /api/bases/[key]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
