/**
 * Apify Instagram Reel Scraper — thin wrapper.
 *
 * Actor: apify~instagram-reel-scraper
 * Env:   APIFY_API_TOKEN
 *
 * Exported:
 *   startRun         — kick off a new actor run
 *   pollRun          — poll until SUCCEEDED | FAILED (or timeout)
 *   fetchItems       — download dataset items
 *   mapItemToReelCreate — map raw Apify item → Prisma ReelCreateManyInput
 */

import type { Prisma } from '@prisma/client'

// ─── Apify raw item shape ──────────────────────────────────────────────────

/**
 * Fields returned by the apify~instagram-reel-scraper actor per item.
 * Matches what the existing `app/api/analizador/scrape/route.ts` uses.
 */
export interface ApifyReelItem {
  /** Instagram internal ID (numeric string) */
  id: string
  /** Public Instagram URL — e.g. https://www.instagram.com/reel/ABC123/ */
  url: string
  /** Post caption text */
  caption: string | null
  /** Play / view count */
  videoPlayCount: number | null
  /** Like count */
  likesCount: number | null
  /** Comment count */
  commentsCount: number | null
  /** Share count (not always present) */
  sharesCount: number | null
  /** ISO timestamp string when the reel was posted */
  timestamp: string | null
  /** Thumbnail CDN URL */
  displayUrl: string | null
  /** Video CDN URL (expires — used for Groq transcription) */
  videoUrl: string | null
  /** Duration in seconds */
  videoDuration: number | null
  /** Shortcode, e.g. "ABC123" — derived from url when absent */
  shortCode?: string | null
}

// ─── Internal helpers ──────────────────────────────────────────────────────

const BASE = 'https://api.apify.com/v2'

function apifyHeaders(): Record<string, string> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error('APIFY_API_TOKEN no configurado')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/** Extract the shortcode from the reel's public URL. */
function shortcodeFromUrl(url: string): string {
  // https://www.instagram.com/reel/ABC123/... → "ABC123"
  const m = url.match(/\/reel\/([A-Za-z0-9_-]+)/i)
  return m?.[1] ?? url.split('/').filter(Boolean).pop() ?? 'unknown'
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Start an Apify actor run for the given usernames.
 *
 * @returns The Apify run ID.
 */
export async function startRun(
  usernames: string[],
  resultsLimit: number,
): Promise<{ runId: string }> {
  const res = await fetch(`${BASE}/acts/apify~instagram-reel-scraper/runs`, {
    method: 'POST',
    headers: apifyHeaders(),
    body: JSON.stringify({
      username: usernames,
      resultsLimit,
      skipPinnedPosts: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify startRun failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as { data?: { id?: string } }
  const runId = data?.data?.id
  if (!runId) throw new Error('Apify startRun: respuesta sin runId')
  return { runId }
}

export type PollStatus = 'SUCCEEDED' | 'FAILED'

export interface PollResult {
  status: PollStatus
  datasetId?: string
  error?: string
}

/**
 * Poll an Apify run until it reaches a terminal state or the timeout is exceeded.
 *
 * @param runId          - The Apify run ID to poll.
 * @param opts.pollIntervalMs - How often to check (default: 5 000 ms).
 * @param opts.maxWaitMs      - Hard timeout in ms (default: 270 000 = 4.5 min).
 */
export async function pollRun(
  runId: string,
  opts?: { pollIntervalMs?: number; maxWaitMs?: number },
): Promise<PollResult> {
  const pollIntervalMs = opts?.pollIntervalMs ?? 5_000
  const maxWaitMs = opts?.maxWaitMs ?? 270_000

  const headers = apifyHeaders()
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs))

    const res = await fetch(`${BASE}/actor-runs/${runId}`, { headers })
    if (!res.ok) {
      throw new Error(`Apify pollRun status check failed (${res.status})`)
    }

    const data = (await res.json()) as {
      data?: { status?: string; defaultDatasetId?: string }
    }
    const status = data?.data?.status
    const datasetId = data?.data?.defaultDatasetId

    if (status === 'SUCCEEDED') {
      return { status: 'SUCCEEDED', datasetId }
    }
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      return { status: 'FAILED', error: `Actor terminal status: ${status}` }
    }
    // READY / RUNNING — continue polling
  }

  return { status: 'FAILED', error: 'Timeout esperando Apify (maxWaitMs alcanzado)' }
}

/**
 * Fetch all items from an Apify dataset up to `limit`.
 */
export async function fetchItems(
  datasetId: string,
  limit: number,
): Promise<ApifyReelItem[]> {
  const res = await fetch(
    `${BASE}/datasets/${datasetId}/items?limit=${limit}`,
    { headers: apifyHeaders() },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify fetchItems failed (${res.status}): ${text}`)
  }

  const items = (await res.json()) as ApifyReelItem[]
  return Array.isArray(items) ? items : []
}

/**
 * Map a raw Apify reel item to a `Prisma.ReelCreateManyInput` record.
 * Handles null/undefined edge cases gracefully.
 */
export function mapItemToReelCreate(
  item: ApifyReelItem,
  competitorId: string,
): Omit<Prisma.ReelCreateManyInput, 'clientId'> {
  const shortcode =
    item.shortCode?.trim() ||
    (item.url ? shortcodeFromUrl(item.url) : 'unknown')

  const instagramId = String(item.id ?? '').trim() || shortcode

  const url =
    item.url?.trim() ||
    `https://www.instagram.com/reel/${shortcode}/`

  const postedAt =
    item.timestamp && !isNaN(Date.parse(item.timestamp))
      ? new Date(item.timestamp)
      : null

  return {
    competitorId,
    instagramId,
    shortcode,
    url,
    thumbnailUrl: item.displayUrl ?? null,
    videoUrl: item.videoUrl ?? null,
    caption: item.caption ?? null,
    viewsCount: item.videoPlayCount ?? 0,
    likesCount: item.likesCount ?? 0,
    commentsCount: item.commentsCount ?? 0,
    sharesCount: item.sharesCount ?? 0,
    durationSec: item.videoDuration ?? null,
    postedAt,
    scrapedAt: new Date(),
  }
}
