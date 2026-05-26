/**
 * POST /api/migrate-encrypt-tokens
 * TEMPORARY — delete after running once. SUPER_ADMIN only.
 *
 * Encrypts all SocialConnection tokens that are still stored as plaintext.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth-user'
import { encryptToken, isEncrypted } from '@/lib/crypto'

const PLAINTEXT_PREFIXES = ['IGAA', 'IGAB', 'ya29.', 'act.', 'EAA', 'EAAB']

function looksLikePlaintext(token: string): boolean {
  if (isEncrypted(token)) return false
  return PLAINTEXT_PREFIXES.some((p) => token.startsWith(p))
}

export async function POST() {
  try { await requireSuperAdmin() } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const connections = await db.socialConnection.findMany({
    select: { id: true, platform: true, accountName: true, accessToken: true, refreshToken: true },
  })

  const results: { platform: string; accountName: string | null; status: string }[] = []

  for (const conn of connections) {
    const accessNeedsEncrypt = looksLikePlaintext(conn.accessToken)
    const refreshNeedsEncrypt = conn.refreshToken ? looksLikePlaintext(conn.refreshToken) : false

    if (!accessNeedsEncrypt && !refreshNeedsEncrypt) {
      results.push({ platform: conn.platform, accountName: conn.accountName, status: 'already_encrypted' })
      continue
    }

    try {
      await db.socialConnection.update({
        where: { id: conn.id },
        data: {
          accessToken: accessNeedsEncrypt ? encryptToken(conn.accessToken) : conn.accessToken,
          refreshToken: refreshNeedsEncrypt && conn.refreshToken
            ? encryptToken(conn.refreshToken)
            : conn.refreshToken,
        },
      })
      results.push({ platform: conn.platform, accountName: conn.accountName, status: 'encrypted' })
    } catch (e) {
      results.push({ platform: conn.platform, accountName: conn.accountName, status: `error: ${String(e).slice(0, 100)}` })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
