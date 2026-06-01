/**
 * GET /api/social/[platform]/status
 *
 * Returns the connection status for the given platform.
 * Always responds with 200 — use the `connected` boolean to distinguish states.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getActiveClientId, getUserIdOrNull } from '@/lib/auth-user'

// ─── Validation ──────────────────────────────────────────────────────────────

const PlatformSchema = z.enum(['instagram', 'tiktok', 'youtube', 'meta-ads'])

// ─── Response type ────────────────────────────────────────────────────────────

interface StatusResponse {
  connected: boolean
  tokenExpired?: boolean
  accountName?: string
  accountPic?: string
  connectedAt?: string
  expiresAt?: string | null
}

// ─── GET /api/social/[platform]/status ───────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
): Promise<NextResponse<StatusResponse>> {
  const { platform: rawPlatform } = await params
  const parsed = PlatformSchema.safeParse(rawPlatform)
  if (!parsed.success) {
    return NextResponse.json({ connected: false }, { status: 200 })
  }
  const platform = parsed.data

  const userId = await getUserIdOrNull()
  if (!userId) {
    return NextResponse.json({ connected: false })
  }
  const clientId = await getActiveClientId()
  if (!clientId) {
    return NextResponse.json({ connected: false })
  }

  try {
    const connection = await db.socialConnection.findUnique({ where: { clientId_platform: { clientId, platform } } })

    if (!connection) {
      return NextResponse.json({ connected: false })
    }

    const isExpired = connection.expiresAt ? connection.expiresAt <= new Date() : false

    const response: StatusResponse = {
      connected: !isExpired,
      tokenExpired: isExpired,
      accountName: connection.accountName,
      accountPic: connection.accountPic ?? undefined,
      connectedAt: connection.connectedAt.toISOString(),
      expiresAt: connection.expiresAt?.toISOString() ?? null,
    }
    return NextResponse.json(response)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[${platform}/status] DB error:`, message)
    return NextResponse.json({ connected: false })
  }
}
