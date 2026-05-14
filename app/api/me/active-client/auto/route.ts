/**
 * GET /api/me/active-client/auto — stub redirect.
 * No longer needed: clientId lives on profile, no cookie assignment required.
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const next = req.nextUrl.searchParams.get('next') ?? '/'
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  return NextResponse.redirect(new URL(safe, req.url))
}
