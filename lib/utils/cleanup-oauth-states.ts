import { db } from '@/lib/db'

/**
 * Deletes all OAuthState rows whose `expiresAt` is in the past.
 * Call this at the start of the OAuth callback handler to prevent
 * the table from growing unbounded.
 */
export async function cleanupExpiredStates(): Promise<void> {
  await db.oAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}
