/**
 * scripts/encrypt-existing-tokens.ts
 *
 * One-time migration: encrypts all SocialConnection tokens that are still
 * stored as plaintext (i.e. before OAUTH_TOKEN_ENCRYPTION_KEY was set in prod).
 *
 * Detection heuristic: plaintext IG tokens start with "IGAA", YouTube tokens
 * start with "ya29.", TikTok tokens start with "act.", Meta tokens start
 * with "EAA". Anything that does NOT start with "v1." and matches a known
 * plaintext prefix is re-encrypted.
 *
 * Run once in production AFTER setting OAUTH_TOKEN_ENCRYPTION_KEY in Vercel:
 *
 *   vercel env pull .env.production.local --environment=production
 *   npx dotenv -e .env.production.local -- npx tsx scripts/encrypt-existing-tokens.ts
 *
 * Safe to re-run: already-encrypted tokens (starting with "v1.") are skipped.
 */

import { PrismaClient } from '@prisma/client'
import { encryptToken, isEncrypted } from '../lib/crypto'

const db = new PrismaClient()

// Known plaintext token prefixes (expand as needed)
const PLAINTEXT_PREFIXES = ['IGAA', 'IGAB', 'ya29.', 'act.', 'EAA', 'EAAB']

function looksLikePlaintext(token: string): boolean {
  if (isEncrypted(token)) return false
  return PLAINTEXT_PREFIXES.some((p) => token.startsWith(p))
}

async function main() {
  const key = process.env.OAUTH_TOKEN_ENCRYPTION_KEY
  if (!key) {
    console.error('❌ OAUTH_TOKEN_ENCRYPTION_KEY is not set — cannot encrypt. Aborting.')
    process.exit(1)
  }
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    console.error('❌ OAUTH_TOKEN_ENCRYPTION_KEY must be exactly 64 hex chars. Aborting.')
    process.exit(1)
  }

  const connections = await db.socialConnection.findMany({
    select: { id: true, platform: true, accountName: true, accessToken: true, refreshToken: true },
  })

  console.log(`Found ${connections.length} SocialConnection rows.`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const conn of connections) {
    const accessNeedsEncrypt = looksLikePlaintext(conn.accessToken)
    const refreshNeedsEncrypt = conn.refreshToken ? looksLikePlaintext(conn.refreshToken) : false

    if (!accessNeedsEncrypt && !refreshNeedsEncrypt) {
      console.log(`  SKIP  [${conn.platform}] ${conn.accountName} — already encrypted or unknown format`)
      skipped++
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
      console.log(`  OK    [${conn.platform}] ${conn.accountName} — encrypted`)
      updated++
    } catch (e) {
      console.error(`  ERROR [${conn.platform}] ${conn.accountName}:`, e)
      errors++
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`)
  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
