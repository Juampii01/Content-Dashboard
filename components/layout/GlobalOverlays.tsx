'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

const IdeasButton = dynamic(() => import('@/components/ideas/IdeasButton').then((m) => m.IdeasButton), { ssr: false })
const Toaster = dynamic(() => import('sonner').then((m) => m.Toaster), { ssr: false })

export function GlobalOverlays() {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/pending-approval'

  return (
    <>
      {!isAuthPage && <IdeasButton />}
      <Toaster position="bottom-right" richColors />
    </>
  )
}
