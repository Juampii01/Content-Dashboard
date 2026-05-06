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
  nombre:    z.string().optional(),
  edad:      z.string().optional(),
  ingresos:  z.string().optional(),
  nicho:     z.string().optional(),
  rol:       z.string().optional(),
  dolores:   z.array(z.string()).optional(),
  deseos:    z.array(z.string()).optional(),
  creencias: z.array(z.string()).optional(),
})

export async function GET() {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth
  try {
    const profile = await db.iCPProfile.findFirst({ where: { clientId } })
    return NextResponse.json(profile ?? null)
  } catch (err) {
    console.error('[GET /api/bases/icp]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { userId, clientId } = auth
  try {
    const json = await request.json()
    const parsed = PutBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const body = parsed.data
    const data = {
      ...(body.nombre    !== undefined && { nombre:    body.nombre }),
      ...(body.edad      !== undefined && { edad:      body.edad }),
      ...(body.ingresos  !== undefined && { ingresos:  body.ingresos }),
      ...(body.nicho     !== undefined && { nicho:     body.nicho }),
      ...(body.rol       !== undefined && { rol:       body.rol }),
      ...(body.dolores   !== undefined && { dolores:   JSON.stringify(body.dolores) }),
      ...(body.deseos    !== undefined && { deseos:    JSON.stringify(body.deseos) }),
      ...(body.creencias !== undefined && { creencias: JSON.stringify(body.creencias) }),
    }

    // Use upsert on the single ICPProfile row (find the first one, or create one)
    const existing = await db.iCPProfile.findFirst({ where: { clientId } })

    let profile
    if (existing) {
      profile = await db.iCPProfile.update({ where: { id: existing.id }, data: { ...data, updatedBy: userId } })
    } else {
      profile = await db.iCPProfile.create({ data: { clientId, createdBy: userId, updatedBy: userId, ...data } })
    }

    return NextResponse.json(profile)
  } catch (err) {
    console.error('[PUT /api/bases/icp]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
