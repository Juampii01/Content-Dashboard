/**
 * DELETE /api/social/[platform]/disconnect
 *
 * Removes the stored OAuth connection for the given platform.
 * Idempotent — returns { success: true } even when no row exists.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

// ─── Validation ──────────────────────────────────────────────────────────────

const PlatformSchema = z.enum(['instagram', 'tiktok', 'youtube'])

// ─── DELETE /api/social/[platform]/disconnect ─────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }
  const { platform: rawPlatform } = await params
  const parsed = PlatformSchema.safeParse(rawPlatform)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Plataforma no válida' },
      { status: 400 },
    )
  }
  const platform = parsed.data

  try {
    await db.socialConnection.delete({ where: { clientId_platform: { clientId, platform } } })
  } catch (e: unknown) {
    // P2025 = record not found — idempotent, treat as success
    if ((e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ success: true })
    }
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[${platform}/disconnect] DB error:`, message)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
