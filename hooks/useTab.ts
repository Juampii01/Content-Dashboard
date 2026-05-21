'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { Tab } from '@/lib/types'

const VALID_TABS: Tab[] = ['dashboard', 'reels', 'historias', 'publicaciones', 'competencia', 'referencias', 'demografia', 'publicar', 'comentarios', 'mensajes', 'audiencia']

export function useTab(): [Tab, (t: Tab) => void] {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const raw = searchParams.get('tab') as Tab
  const tab: Tab = VALID_TABS.includes(raw) ? raw : 'dashboard'

  function setTab(t: Tab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', t)
    // replace, not push: tab switches within a page are intra-view transitions,
    // not navigation events. push spammed browser history and broke Back (ui-M11).
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return [tab, setTab]
}
