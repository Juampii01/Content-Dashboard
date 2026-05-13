/**
 * Apify Instagram Story Scraper — thin wrapper.
 *
 * Actor: apify~instagram-story-scraper
 *   https://apify.com/apify/instagram-story-scraper
 *
 * Returns the currently-LIVE stories (last 24h) for a list of usernames.
 * Insights metrics (reach, impressions, replies, stickerTaps, exits,
 * completionRate) are NOT exposed publicly and require Meta's Graph API
 * with `instagram_manage_insights` scope (App Review or Test Users).
 * For this Apify path those fields default to 0 in our DB.
 *
 * Env: APIFY_API_TOKEN (shared with other scrapers).
 */

export interface ApifyStoryItem {
  /** Story internal ID — numeric string */
  id: string
  /** Story type: 'video' | 'image' */
  type?: string | null
  /** Display image URL (cover for videos) */
  displayUrl?: string | null
  /** Video URL (if type === 'video') */
  videoUrl?: string | null
  /** Unix timestamp seconds when the story was posted */
  takenAtTimestamp?: number | null
  /** Owner username */
  ownerUsername?: string | null
  /** Duration in seconds (video stories only) */
  videoDuration?: number | null
}

const BASE = 'https://api.apify.com/v2'
const ACTOR_ID = 'apify~instagram-story-scraper'

function apifyHeaders(): Record<string, string> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error('APIFY_API_TOKEN no configurado')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function startRun(usernames: string[]): Promise<{ runId: string }> {
  const res = await fetch(`${BASE}/acts/${ACTOR_ID}/runs`, {
    method: 'POST',
    headers: apifyHeaders(),
    body: JSON.stringify({
      usernames,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify Story startRun failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as { data?: { id?: string } }
  const runId = data?.data?.id
  if (!runId) throw new Error('Apify Story startRun: respuesta sin runId')
  return { runId }
}

export type PollStatus = 'SUCCEEDED' | 'FAILED'

export interface PollResult {
  status: PollStatus
  datasetId?: string
  error?: string
}

export async function pollRun(
  runId: string,
  opts?: { pollIntervalMs?: number; maxWaitMs?: number },
): Promise<PollResult> {
  const pollIntervalMs = opts?.pollIntervalMs ?? 3_000
  const maxWaitMs = opts?.maxWaitMs ?? 120_000

  const headers = apifyHeaders()
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs))

    const res = await fetch(`${BASE}/actor-runs/${runId}`, { headers })
    if (!res.ok) {
      throw new Error(`Apify Story pollRun status check failed (${res.status})`)
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

  return { status: 'FAILED', error: 'Timeout esperando Apify Stories (maxWaitMs alcanzado)' }
}

export async function fetchItems(
  datasetId: string,
  limit: number,
): Promise<ApifyStoryItem[]> {
  const res = await fetch(
    `${BASE}/datasets/${datasetId}/items?limit=${limit}`,
    { headers: apifyHeaders() },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify Story fetchItems failed (${res.status}): ${text}`)
  }

  const items = (await res.json()) as ApifyStoryItem[]
  return Array.isArray(items) ? items : []
}
