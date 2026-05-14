/**
 * GET /api/youtube/demographics
 *
 * Calls YouTube Analytics API v2 for the last 28 days:
 *   - viewerPercentage by ageGroup × gender → age buckets + gender split
 *   - views by country (top 10) → country distribution
 *
 * Returns:
 *   200 { available: true, ageGroups, gender, topCountries }
 *   200 { available: false }  — scope not granted or analytics not enabled
 *   401 / 403 / 404 on auth/connection issues
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { youtubeFetch, YouTubeAuthError } from '@/lib/youtube/auth'

const ANALYTICS = 'https://youtubeanalytics.googleapis.com/v2/reports'

const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina', US: 'Estados Unidos', MX: 'México', ES: 'España',
  CO: 'Colombia', CL: 'Chile', PE: 'Perú', BR: 'Brasil',
  UY: 'Uruguay', VE: 'Venezuela', EC: 'Ecuador', BO: 'Bolivia',
  PY: 'Paraguay', GT: 'Guatemala', CR: 'Costa Rica', DO: 'Rep. Dominicana',
  PA: 'Panamá', HN: 'Honduras', SV: 'El Salvador', NI: 'Nicaragua',
  DE: 'Alemania', FR: 'Francia', IT: 'Italia', GB: 'Reino Unido',
  CA: 'Canadá', AU: 'Australia', JP: 'Japón', KR: 'Corea del Sur',
  IN: 'India', CN: 'China',
}

function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code
}

export async function GET(): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
    void userId
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const connection = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'youtube' } },
  })
  if (!connection) return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })

  // Date range: last 28 days
  const endDate = new Date()
  endDate.setUTCHours(0, 0, 0, 0)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 28)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  try {
    // ── 1. Age × gender demographics ─────────────────────────────────────────
    const ageGenderUrl =
      `${ANALYTICS}?ids=channel==MINE` +
      `&startDate=${fmt(startDate)}&endDate=${fmt(endDate)}` +
      `&metrics=viewerPercentage&dimensions=ageGroup,gender`

    const ageGenderRes = await youtubeFetch(ageGenderUrl, connection)

    // 403 = scope not granted or analytics not enabled for this channel
    if (ageGenderRes.status === 403 || ageGenderRes.status === 401) {
      console.info('[youtube/demographics] analytics not available (status', ageGenderRes.status, ')')
      return NextResponse.json({ available: false })
    }
    if (!ageGenderRes.ok) {
      console.warn('[youtube/demographics] age/gender fetch failed', ageGenderRes.status)
      return NextResponse.json({ available: false })
    }

    const ageGenderRaw = (await ageGenderRes.json()) as {
      rows?: Array<[string, string, number]>
    }

    // Sum by age group (both genders combined)
    const byAge: Record<string, number> = {}
    const byGender: Record<string, number> = {}
    for (const [ageGroup, gender, pct] of ageGenderRaw.rows ?? []) {
      byAge[ageGroup] = (byAge[ageGroup] ?? 0) + pct
      byGender[gender] = (byGender[gender] ?? 0) + pct
    }

    // Normalize to 100 %
    const totalAge = Object.values(byAge).reduce((s, v) => s + v, 0) || 1
    const totalGender = Object.values(byGender).reduce((s, v) => s + v, 0) || 1

    const AGE_LABEL: Record<string, string> = {
      'age13-17': '13-17', 'age18-24': '18-24', 'age25-34': '25-34',
      'age35-44': '35-44', 'age45-54': '45-54', 'age55-64': '55-64', 'age65-': '65+',
    }
    const GENDER_LABEL: Record<string, string> = {
      male: 'Hombres', female: 'Mujeres', user_specified: 'No especificado',
    }

    const ageGroups = Object.entries(byAge)
      .map(([key, val]) => ({
        range: AGE_LABEL[key] ?? key,
        percent: Math.round((val / totalAge) * 100),
      }))
      .sort((a, b) => {
        const order = Object.values(AGE_LABEL)
        return order.indexOf(a.range) - order.indexOf(b.range)
      })

    const gender = Object.entries(byGender)
      .map(([key, val]) => ({
        label: GENDER_LABEL[key] ?? key,
        percent: Math.round((val / totalGender) * 100),
      }))
      .sort((a, b) => b.percent - a.percent)

    // ── 2. Top countries ──────────────────────────────────────────────────────
    const countriesUrl =
      `${ANALYTICS}?ids=channel==MINE` +
      `&startDate=${fmt(startDate)}&endDate=${fmt(endDate)}` +
      `&metrics=views&dimensions=country&sort=-views&maxResults=10`

    const countriesRes = await youtubeFetch(countriesUrl, connection)
    const countriesRaw = countriesRes.ok
      ? ((await countriesRes.json()) as { rows?: Array<[string, number]> })
      : { rows: [] }

    const totalViews = (countriesRaw.rows ?? []).reduce((s, [, v]) => s + v, 0) || 1
    const topCountries = (countriesRaw.rows ?? []).map(([code, views]) => ({
      country: countryName(code),
      percent: Math.round((views / totalViews) * 100),
    }))

    return NextResponse.json({ available: true, ageGroups, gender, topCountries })
  } catch (err) {
    if (err instanceof YouTubeAuthError) {
      const status = err.code === 'INVALID_GRANT' || err.code === 'NO_REFRESH_TOKEN' ? 401 : 500
      return NextResponse.json({ error: err.code, reconnect: status === 401 }, { status })
    }
    console.error('[youtube/demographics] error:', err)
    return NextResponse.json({ available: false })
  }
}
