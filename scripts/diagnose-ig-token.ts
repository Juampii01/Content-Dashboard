/**
 * scripts/diagnose-ig-token.ts
 *
 * Diagnoses the Instagram token stored in production for a given clientId.
 * Run with:
 *   npx dotenv -e .env.production.local -- npx tsx scripts/diagnose-ig-token.ts
 */

import { PrismaClient } from '@prisma/client'
import { decryptToken } from '../lib/crypto'

const CLIENT_ID = 'cmp5vftlr0000ju04v4iagnzm'

const db = new PrismaClient()

async function fetchAndPrint(label: string, url: string) {
  console.log(`\n── ${label}`)
  console.log(`   URL: ${url.replace(/access_token=[^&]+/, 'access_token=<REDACTED>')}`)
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const body = await res.text()
    console.log(`   Status: ${res.status}`)
    try {
      console.log(`   Body:`, JSON.stringify(JSON.parse(body), null, 2))
    } catch {
      console.log(`   Body (raw):`, body.slice(0, 500))
    }
  } catch (e) {
    console.log(`   ERROR:`, e)
  }
}

async function main() {
  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId: CLIENT_ID, platform: 'instagram' } },
  })

  if (!conn) {
    console.error('❌ No SocialConnection found for clientId:', CLIENT_ID)
    process.exit(1)
  }

  console.log('\n═══ SocialConnection stored data ═══')
  console.log('  accountId  :', conn.accountId)
  console.log('  accountName:', conn.accountName)
  console.log('  expiresAt  :', conn.expiresAt?.toISOString() ?? 'null')

  const token = decryptToken(conn.accessToken)
  console.log('  token (first 25 chars):', token.slice(0, 25) + '...')
  console.log('  token length:', token.length)

  const t = encodeURIComponent(token)
  const igUserId = conn.accountId

  await fetchAndPrint(
    'a) graph.instagram.com/v21.0/me (versioned)',
    `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type&access_token=${t}`,
  )

  await fetchAndPrint(
    'b) graph.instagram.com/me (unversioned)',
    `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${t}`,
  )

  await fetchAndPrint(
    'c) graph.instagram.com/v21.0/me/media',
    `https://graph.instagram.com/v21.0/me/media?fields=id,caption&limit=5&access_token=${t}`,
  )

  await fetchAndPrint(
    'd) graph.facebook.com/v21.0/me (Facebook Graph — token type check)',
    `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${t}`,
  )

  await fetchAndPrint(
    `e) graph.instagram.com/${igUserId} (by stored user_id, no version)`,
    `https://graph.instagram.com/${igUserId}?fields=id,username,account_type&access_token=${t}`,
  )

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
