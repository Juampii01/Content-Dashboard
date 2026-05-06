'use client'

import { usePathname } from 'next/navigation'

/**
 * Wraps page content with a key tied to the current pathname.
 * When the route changes, React unmounts and remounts the div, triggering
 * the animate-slide-up-fade CSS animation defined in globals.css.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="animate-page-fade">
      {children}
    </div>
  )
}
