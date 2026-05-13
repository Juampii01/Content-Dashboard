/**
 * Apify TikTok Scraper — thin wrapper.
 *
 * Actor: clockworks~tiktok-scraper (the most stable / actively-maintained
 * actor at time of writing). Item shape is documented at:
 *   https://apify.com/clockworks/tiktok-scraper
 *
 * Env: APIFY_API_TOKEN  (shared with the Instagram scrapers)
 *
 * Exported:
 *   startRun         — kick off an actor run for a list of profile handles
 *   pollRun          — poll until SUCCEEDED | FAILED (or timeout)
 *   fetchItems       — download dataset items
 *   ApifyTikTokVideoItem — raw item shape
 */

// ─── Apify raw item shape ──────────────────────────────────────────────────

/**
 * Subset of fields the clockworks~tiktok-scraper actor returns per video.
 * We only declare what we actually consume — the actor's output schema is
 * much wider but most of it isn't useful for the dashboard surface.
 */
export interface ApifyTikTokVideoItem {
  /** TikTok internal video ID — numeric string */
  id: string
  /** Public TikTok URL — https://www.tiktok.com/@user/video/123... */
  webVideoUrl?: string | null
  /** Caption / description */
  text?: string | null
  /** Video play count */
  playCount?: number | null
  /** Like count (diggCount in the raw payload) */
  diggCount?: number | null
  /** Comment count */
  commentCount?: number | null
  /** Share count */
  shareCount?: number | null
  /** Duration in seconds */
  videoMeta?: {
    duration?: number | null
    coverUrl?: string | null
    originalCoverUrl?: string | null
    downloadAddr?: string | null
  } | null
  /** Unix timestamp seconds when the video was posted */
  createTime?: number | null
  /** Author info — used to confirm the video belongs to the queried handle */
  authorMeta?: {
    name?: string | null
    nickName?: string | null
  } | null
}

// ─── Internal helpers ──────────────────────────────────────────────────────

const BASE = 'https://api.apify.com/v2'
const ACTOR_ID = 'clockworks~tiktok-scraper'

function apifyHeaders(): Record<string, string> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error('APIFY_API_TOKEN no configurado')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Start an Apify actor run for the given TikTok handles.
 * Note: handles must NOT include the leading "@".
 */
export async function startRun(
  handles: string[],
  resultsPerPage: number,
): Promise<{ runId: string }> {
  const res = await fetch(`${BASE}/acts/${ACTOR_ID}/runs`, {
    method: 'POST',
    headers: apifyHeaders(),
    body: JSON.stringify({
      profiles: handles,
      resultsPerPage,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify TikTok startRun failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as { data?: { id?: string } }
  const runId = data?.data?.id
  if (!runId) throw new Error('Apify TikTok startRun: respuesta sin runId')
  return { runId }
}

export type PollStatus = 'SUCCEEDED' | 'FAILED'

export interface PollResult {
  status: PollStatus
  datasetId?: string
  error?: string
}

/**
 * Poll an Apify run until terminal state or timeout.
 */
export async function pollRun(
  runId: string,
  opts?: { pollIntervalMs?: number; maxWaitMs?: number },
): Promise<PollResult> {
  const pollIntervalMs = opts?.pollIntervalMs ?? 4_000
  const maxWaitMs = opts?.maxWaitMs ?? 180_000

  const headers = apifyHeaders()
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs))

    const res = await fetch(`${BASE}/actor-runs/${runId}`, { headers })
    if (!res.ok) {
      throw new Error(`Apify TikTok pollRun status check failed (${res.status})`)
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
  }

  return { status: 'FAILED', error: 'Timeout esperando Apify TikTok (maxWaitMs alcanzado)' }
}

/**
 * Fetch dataset items up to `limit`.
 */
export async function fetchItems(
  datasetId: string,
  limit: number,
): Promise<ApifyTikTokVideoItem[]> {
  const res = await fetch(
    `${BASE}/datasets/${datasetId}/items?limit=${limit}`,
    { headers: apifyHeaders() },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify TikTok fetchItems failed (${res.status}): ${text}`)
  }

  const items = (await res.json()) as ApifyTikTokVideoItem[]
  return Array.isArray(items) ? items : []
}
