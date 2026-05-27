'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { Period } from '@/lib/types'

const VALID_PERIODS: Period[] = [0, 7, 14, 30, 90]

export function usePeriod(): [Period, (p: Period) => void] {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const rawParam = searchParams.get('period')
  const raw = rawParam !== null ? Number(rawParam) : null
  const period: Period = (raw !== null && VALID_PERIODS.includes(raw as Period) ? raw : 30) as Period

  function setPeriod(p: Period) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', String(p))
    // replace, not push: period changes are filter tweaks, not navigation events.
    // Using push bloats browser history with one entry per period click, making
    // the Back button unusable (ui-M11).
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return [period, setPeriod]
}
