/**
 * POST /api/guiones/tabs/[tabId]/items — create an item under a tab
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

const CreateItemSchema = z.object({
  title:   z.string().min(1).max(200),
  content: z.string().optional(),
  order:   z.number().int().optional(),
})

type RouteContext = { params: Promise<{ tabId: string }> }

export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }
  const { tabId } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', ...(process.env.NODE_ENV !== 'production' ? { issues: parsed.error.flatten() } : {}) },
      { status: 400 },
    )
  }

  try {
    const { title, content, order } = parsed.data
    // Ensure the tab belongs to the active client
    const tab = await db.guionTab.findUnique({ where: { id: tabId } })
    if (!tab || tab.clientId !== clientId) {
      return NextResponse.json({ error: 'Tab not found' }, { status: 404 })
    }

    const item = await db.guionItem.create({
      data: {
        clientId,
        createdBy: userId,
        updatedBy: userId,
        tabId,
        title,
        content: content ?? '',
        order: order ?? 0,
      },
    })
    return NextResponse.json({ item }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if ((err as { code?: string }).code === 'P2003') {
      return NextResponse.json({ error: 'Tab not found' }, { status: 404 })
    }
    console.error('[guiones/tabs/[tabId]/items POST] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
