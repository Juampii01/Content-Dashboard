/**
 * POST /api/me/brand-theme — no-op stub.
 *
 * Brand theme persistence moved to localStorage ('admin_theme') on the client.
 * Kept to avoid 404s from any in-flight requests during deploy.
 */
import { NextResponse } from 'next/server'

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ ok: true })
}
