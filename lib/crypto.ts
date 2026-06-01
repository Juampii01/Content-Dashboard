/**
 * OAuth token encryption helpers.
 *
 * Social-connection access/refresh tokens are stored in Postgres. In the
 * current schema they're plaintext — a compromised DB snapshot leaks every
 * user's IG/YT/TT token. This module provides AES-256-GCM encryption with a
 * 32-byte hex key in `OAUTH_TOKEN_ENCRYPTION_KEY` so writes can rotate to
 * ciphertext while reads stay backwards-compatible with legacy plaintext
 * during the rollout window.
 *
 * Ciphertext format: `v1.<iv>.<tag>.<ct>` (all base64url). The version prefix
 * lets callers tell at a glance whether a value is ciphertext or legacy
 * plaintext (legacy values never contain a dot after `v1`).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const KEY_ENV = 'OAUTH_TOKEN_ENCRYPTION_KEY'
const IV_LENGTH_BYTES = 12 // GCM standard
const VERSION = 'v1'

/**
 * Encrypt a plaintext token. Returns a versioned, dot-separated payload
 * safe to store in a TEXT column.
 *
 * If OAUTH_TOKEN_ENCRYPTION_KEY is not set, returns plaintext with a warning
 * (legacy/graceful mode — set the key in production for encryption at rest).
 */
export function encryptToken(plaintext: string): string {
  const raw = process.env[KEY_ENV]
  if (!raw) {
    throw new Error('OAUTH_TOKEN_ENCRYPTION_KEY is not set — refusing to store token as plaintext')
  }
  if (!/^[0-9a-f]{64}$/i.test(raw)) {
    console.error(`[crypto] ${KEY_ENV} must be exactly 64 hex characters — skipping encryption`)
    return plaintext
  }
  const key = Buffer.from(raw, 'hex')
  const iv = randomBytes(IV_LENGTH_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

/**
 * Decrypt a versioned payload. If the input is NOT a versioned payload
 * (i.e. legacy plaintext stored before this module shipped) it's returned
 * unchanged so in-place rollout works.
 */
export function decryptToken(payload: string): string {
  if (!payload.startsWith(`${VERSION}.`)) {
    // Legacy plaintext — pass through unchanged. Next write will re-encrypt.
    return payload
  }
  const parts = payload.split('.')
  if (parts.length !== 4) {
    throw new Error(`Malformed encrypted token (expected 4 dot-separated parts, got ${parts.length})`)
  }
  const raw = process.env[KEY_ENV]
  if (!raw) {
    console.error('[crypto] OAUTH_TOKEN_ENCRYPTION_KEY not set — cannot decrypt token')
    throw new Error('DECRYPTION_KEY_MISSING')
  }
  if (!/^[0-9a-f]{64}$/i.test(raw)) {
    console.error(`[crypto] ${KEY_ENV} malformed — cannot decrypt`)
    throw new Error('DECRYPTION_KEY_MALFORMED')
  }
  const [, ivB64, tagB64, cipherB64] = parts
  const key = Buffer.from(raw, 'hex')
  const iv = Buffer.from(ivB64, 'base64url')
  const tag = Buffer.from(tagB64, 'base64url')
  const ct = Buffer.from(cipherB64, 'base64url')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
  return plaintext
}

/**
 * Helper: `true` if a stored value is already encrypted under this scheme.
 * Useful when writing a lazy "encrypt if legacy" migration on next-write.
 */
export function isEncrypted(payload: string): boolean {
  return payload.startsWith(`${VERSION}.`) && payload.split('.').length === 4
}
