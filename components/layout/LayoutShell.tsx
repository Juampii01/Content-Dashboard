'use client'

import { useState, createContext } from 'react'
import { usePathname } from 'next/navigation'
import { z } from 'zod'
import { Sidebar } from './Sidebar'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'

export const MobileSidebarContext = createContext<{ open: () => void }>({
  open: () => {},
})

const collapsedSchema = z.boolean()

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage('eternity_sidebar_collapsed', collapsedSchema, false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    if (mobileOpen) setMobileOpen(false)
  }

  const toggle = () => {
    setCollapsed((c) => !c)
  }

  return (
    <MobileSidebarContext.Provider value={{ open: () => setMobileOpen(true) }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        suppressHydrationWarning
        className="ls-shell ambient-bg min-h-screen flex flex-col md:transition-[margin-left] md:duration-300 md:ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          ['--shell-ml-md' as string]: collapsed ? '80px' : '240px',
          marginLeft: 'var(--shell-ml, 0px)',
        }}
      >
        <style>{`.ls-shell{--shell-ml:0px}@media(min-width:768px){.ls-shell{--shell-ml:var(--shell-ml-md)}}`}</style>
        <div key={pathname} className="page-enter contents">
          {children}
        </div>
      </div>
    </MobileSidebarContext.Provider>
  )
}
