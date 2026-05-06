/**
 * Shared helper — resolves a competitor by CUID or by username.
 *
 * Exported from a single location so that route handlers don't duplicate
 * the CUID-vs-username heuristic logic.
 *
 * Scoped by clientId: the (clientId, username) pair is unique (not username alone),
 * so callers MUST pass the active client id for username lookups.
 */

import { db } from '@/lib/db'
import type { Competitor } from '@prisma/client'

/** Prisma CUID v1 heuristic: starts with "c", followed by 24 lowercase alphanumeric chars. */
const CUID_REGEX = /^c[a-z0-9]{24}$/

/**
 * Resolves an identifier that can be either a Prisma CUID or an Instagram username.
 *
 * @param idOrUsername - Raw route param (may be URL-encoded).
 * @param clientId     - Active client id. When looking up by CUID we also enforce scope.
 * @returns The matching Competitor row, or `null` if not found / not scoped.
 */
export async function resolveCompetitor(
  idOrUsername: string,
  clientId: string,
): Promise<Competitor | null> {
  const decoded = decodeURIComponent(idOrUsername)

  if (CUID_REGEX.test(decoded)) {
    const row = await db.competitor.findUnique({ where: { id: decoded } })
    if (!row || row.clientId !== clientId) return null
    return row
  }

  return db.competitor.findUnique({
    where: { clientId_username: { clientId, username: decoded } },
  })
}
