/**
 * POST /api/me/active-client — no-op stub.
 * Client switching is removed; clientId lives on profile.clientId.
 * Kept to avoid breaking any in-flight requests.
 */
import { NextResponse } from 'next/server'

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ ok: true })
}
