import { encryptToken, decryptToken, isEncrypted } from '@/lib/crypto'
import { randomBytes } from 'node:crypto'

const VALID_KEY = randomBytes(32).toString('hex')

describe('lib/crypto', () => {
  const originalEnv = process.env.OAUTH_TOKEN_ENCRYPTION_KEY

  beforeEach(() => {
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = VALID_KEY
  })

  afterAll(() => {
    if (originalEnv === undefined) delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY
    else process.env.OAUTH_TOKEN_ENCRYPTION_KEY = originalEnv
  })

  describe('encryptToken / decryptToken round-trip', () => {
    it('round-trips a typical OAuth access token', () => {
      const token = 'EAABsbCS1iHgBO8cV4ZAjaLZBZCZAyXc0h7fakedtokenpayload1234567890'
      const cipher = encryptToken(token)
      expect(cipher).not.toBe(token)
      expect(decryptToken(cipher)).toBe(token)
    })

    it('round-trips an empty string', () => {
      const cipher = encryptToken('')
      expect(decryptToken(cipher)).toBe('')
    })

    it('round-trips multibyte unicode', () => {
      const token = '🔐 token with ñoño and 中文 — mixed bytes'
      const cipher = encryptToken(token)
      expect(decryptToken(cipher)).toBe(token)
    })

    it('produces distinct ciphertexts for the same plaintext (random IV)', () => {
      const token = 'duplicate-plaintext'
      const a = encryptToken(token)
      const b = encryptToken(token)
      expect(a).not.toBe(b)
      expect(decryptToken(a)).toBe(token)
      expect(decryptToken(b)).toBe(token)
    })
  })

  describe('backwards-compat with legacy plaintext', () => {
    it('decryptToken passes through values without the v1 prefix', () => {
      expect(decryptToken('legacy-raw-token')).toBe('legacy-raw-token')
    })

    it('isEncrypted returns false for legacy plaintext', () => {
      expect(isEncrypted('legacy-raw-token')).toBe(false)
    })

    it('isEncrypted returns true for a freshly-encrypted value', () => {
      expect(isEncrypted(encryptToken('hello'))).toBe(true)
    })
  })

  describe('tamper detection', () => {
    // Flip a NON-trailing base64url character; the last char of a base64url-
    // encoded buffer whose length isn't a multiple of 3 bytes carries padding
    // bits that are discarded on decode, so modifying only those bits doesn't
    // actually change the decoded bytes. Flip an early char to ensure real bits
    // move.
    function flipChar(s: string, idx: number): string {
      const ch = s.charAt(idx)
      const swap = ch === 'A' ? 'B' : 'A'
      return s.slice(0, idx) + swap + s.slice(idx + 1)
    }

    it('throws when ciphertext is modified (GCM auth tag)', () => {
      const cipher = encryptToken('sensitive')
      const parts = cipher.split('.')
      parts[3] = flipChar(parts[3], 0)
      const tampered = parts.join('.')
      expect(() => decryptToken(tampered)).toThrow()
    })

    it('throws when the auth tag is swapped', () => {
      const cipher = encryptToken('sensitive')
      const parts = cipher.split('.')
      parts[2] = flipChar(parts[2], 0)
      const tampered = parts.join('.')
      expect(() => decryptToken(tampered)).toThrow()
    })
  })

  describe('key configuration errors', () => {
    it('throws (does NOT store plaintext) when the env var is missing', () => {
      // Security hardening: encryptToken must never silently persist a token in
      // cleartext. With no key configured it throws instead of falling back.
      delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY
      expect(() => encryptToken('x')).toThrow(/not set/)
    })

    it('returns plaintext if the env var is not 64 hex characters (graceful skip)', () => {
      // A malformed key is treated as "encryption unavailable" and skips, rather
      // than crashing — the key can be fixed without data loss on next write.
      process.env.OAUTH_TOKEN_ENCRYPTION_KEY = 'short'
      expect(encryptToken('x')).toBe('x')
    })

    it('throws DECRYPTION_KEY_MISSING when key is absent for an encrypted token', () => {
      // Encrypt with a valid key first
      const cipher = encryptToken('sensitive')
      // Remove key — decrypt must fail loudly instead of returning ciphertext
      // (which would silently be used as a bogus Bearer token).
      delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY
      expect(() => decryptToken(cipher)).toThrow(/DECRYPTION_KEY_MISSING/)
    })
  })

  describe('malformed payload', () => {
    it('throws on a v1-prefixed payload with wrong part count', () => {
      expect(() => decryptToken('v1.only-one-part')).toThrow(/Malformed/)
    })
  })
})
