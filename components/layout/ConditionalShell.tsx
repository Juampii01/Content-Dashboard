'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { LayoutShell } from './LayoutShell'
import { TopBar } from './TopBar'
import { PageTransition } from './PageTransition'

const AUTH_ROUTES = ['/login', '/pending-approval']

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (AUTH_ROUTES.includes(pathname)) return <>{children}</>

  return (
    <LayoutShell>
      <Suspense fallback={null}>
        <TopBar />
      </Suspense>
      <main className="flex-1">
        <Suspense fallback={null}>
          <PageTransition>{children}</PageTransition>
        </Suspense>
      </main>
    </LayoutShell>
  )
}
