import { NextRequest, NextResponse } from 'next/server'
import { ScrapeRequestSchema } from '@/lib/schemas/analizador/scrape'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export async function POST(req: NextRequest) {
  try {
    // clientId extracted for tenant-scoping future DB writes
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { clientId: _clientId } = await requireActiveClient()
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    throw err
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'scrape', 5, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = ScrapeRequestSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: result.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 }
    )
  }

  const { username, limit } = result.data

  const token = process.env.APIFY_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'APIFY_API_TOKEN no configurado' }, { status: 500 })
  }

  const apifyHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // Start Apify actor run
  const runRes = await fetch(
    'https://api.apify.com/v2/acts/apify~instagram-reel-scraper/runs',
    {
      method: 'POST',
      headers: apifyHeaders,
      body: JSON.stringify({
        username: [username.replaceAll('@', '').replace(/[^a-zA-Z0-9_.]/g, '')],
        resultsLimit: limit,
        skipPinnedPosts: false,
      }),
    }
  )

  if (!runRes.ok) {
    const err = await runRes.text()
    console.error('[scrape] upstream error:', err)
    return NextResponse.json({ error: 'Error al iniciar el scraping' }, { status: 502 })
  }

  let runData: { data?: { id?: string } }
  try {
    runData = await runRes.json()
  } catch {
    return NextResponse.json({ error: 'Respuesta inválida de Apify al iniciar run' }, { status: 502 })
  }

  const runId: string | undefined = runData?.data?.id

  if (!runId) {
    return NextResponse.json({ error: 'No se pudo iniciar el actor de Apify' }, { status: 502 })
  }

  // Poll for completion (max 45s — Vercel Pro limit is 60s)
  const maxWait = 45_000
  const pollInterval = 5_000
  const start = Date.now()

  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval))

    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}`,
      { headers: apifyHeaders }
    )

    if (!statusRes.ok) {
      return NextResponse.json({ error: 'Error consultando estado del run de Apify' }, { status: 502 })
    }

    let statusData: { data?: { status?: string; defaultDatasetId?: string } }
    try {
      statusData = await statusRes.json()
    } catch {
      return NextResponse.json({ error: 'Respuesta inválida de Apify al consultar estado' }, { status: 502 })
    }

    const status: string | undefined = statusData?.data?.status

    if (status === 'SUCCEEDED') {
      const datasetId: string | undefined = statusData?.data?.defaultDatasetId
      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?limit=${limit}`,
        { headers: apifyHeaders }
      )

      if (!itemsRes.ok) {
        return NextResponse.json({ error: 'Error descargando items del dataset de Apify' }, { status: 502 })
      }

      let items: unknown
      try {
        items = await itemsRes.json()
      } catch {
        return NextResponse.json({ error: 'Respuesta inválida de Apify al descargar items' }, { status: 502 })
      }

      return NextResponse.json({ reels: items })
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      console.error('[scrape] upstream actor terminal status:', status)
      return NextResponse.json({ error: 'El actor de Apify terminó con un error' }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'Timeout esperando resultados de Apify' }, { status: 504 })
}
