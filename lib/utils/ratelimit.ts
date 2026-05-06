/**
 * Shared rate-limit helper.
 *
 * @upstash/ratelimit and @vercel/kv are optional dependencies — they may not
 * be installed in local dev.  This module degrades gracefully: when the KV env
 * vars are absent, or when the packages are not installed, it returns null so
 * callers can skip the check entirely.
 */

// Import only the type — the real module is loaded dynamically at runtime so
// that tsc never resolves it (packages are optional).
import type { Ratelimit as RatelimitType } from '@upstash/ratelimit'

type RatelimitCtor = typeof RatelimitType

let cachedRatelimit: RatelimitCtor | null = null
let cachedKv: unknown = null
let packagesUnavailable = false

async function loadPackages(): Promise<{ Ratelimit: RatelimitCtor; kv: unknown } | null> {
  if (packagesUnavailable) return null
  if (cachedRatelimit && cachedKv) return { Ratelimit: cachedRatelimit, kv: cachedKv }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rl = require('@upstash/ratelimit') as { Ratelimit: RatelimitCtor }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const kvMod = require('@vercel/kv') as { kv: unknown }
    cachedRatelimit = rl.Ratelimit
    cachedKv = kvMod.kv
    return { Ratelimit: cachedRatelimit, kv: cachedKv }
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
      packagesUnavailable = true
      console.warn(
        '[rate-limit] @upstash/ratelimit or @vercel/kv not installed — ' +
          'add them as optionalDependencies to enable rate limiting'
      )
      return null
    }
    throw e
  }
}

/**
 * Check whether the given IP has exceeded the rate limit.
 *
 * Behavior when rate limiting is unavailable (missing KV env vars or packages
 * not installed):
 *  - **Fail OPEN** by default — returns `null` so callers skip the check and
 *    the endpoint serves normally. A loud `console.error` is logged in prod
 *    so ops see the gap and know to provision KV.
 *  - Opt-in to fail-CLOSED per deployment via `RATE_LIMIT_STRICT=1` (use for
 *    signup/abuse-critical flows where unlimited is worse than 429).
 *
 *  Rationale: the previous fail-closed-by-default behavior made every admin /
 *  analizador / copy / ai endpoint return 429 whenever KV was missing (the
 *  default on a fresh deploy) with no UI-visible error. That effectively
 *  bricked the app for legitimate users. Priority is "app works for real
 *  users" over "no rate-limit bypass in a misconfigured state" — ops still
 *  have to provision KV to actually enforce limits, and the loud error log
 *  makes the missing config obvious.
 *
 * @param ip        - Client IP address used as the rate-limit key prefix.
 * @param keyPrefix - A short string that namespaces the key (e.g. "analyze").
 * @param requests  - Maximum number of requests allowed in the window.
 * @param window    - Sliding-window duration string, e.g. "60 s".
 *
 * @returns `{ success: boolean }` when rate limiting is active. `null` when
 *          it is unavailable — callers treat `null` as "skip the limit".
 */
export async function checkRateLimit(
  ip: string,
  keyPrefix: string,
  requests: number,
  window: string
): Promise<{ success: boolean } | null> {
  const kvUrl = process.env.KV_REST_API_URL
  const kvToken = process.env.KV_REST_API_TOKEN
  const isProd = process.env.NODE_ENV === 'production'
  const strict = process.env.RATE_LIMIT_STRICT === '1'

  if (!kvUrl || !kvToken) {
    if (isProd) {
      console.error(
        '[rate-limit] KV env missing in production (KV_REST_API_URL / KV_REST_API_TOKEN) — ' +
          `SKIPPING rate limit for keyPrefix="${keyPrefix}". Provision Vercel KV to actually enforce.`
      )
      if (strict) return { success: false }
      return null
    }
    console.warn('⚠️ Rate limiting disabled — KV_REST_API_URL / KV_REST_API_TOKEN not configured')
    return null
  }

  const pkgs = await loadPackages()
  if (!pkgs) {
    if (isProd) {
      console.error(
        '[rate-limit] rate-limit packages unavailable in production — ' +
          `SKIPPING rate limit for keyPrefix="${keyPrefix}".`
      )
      if (strict) return { success: false }
      return null
    }
    return null
  }

  const { Ratelimit, kv } = pkgs

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RatelimitAny = Ratelimit as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ratelimit = new RatelimitAny({ redis: kv as any, limiter: RatelimitAny.slidingWindow(requests, window) })

  const { success } = await ratelimit.limit(`${keyPrefix}:${ip}`)
  return { success }
}
