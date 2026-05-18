'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import {
  LayoutDashboard, Camera, Play,
  CheckSquare, BookOpen, Kanban,
  ChevronLeft, ChevronRight, Users,
  Music, Megaphone, LogOut, Shield, UserCog,
  FileText, Telescope, Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAuth } from './AuthProvider'
import { UserMenu } from './UserMenu'
import { useEffectiveRole, setViewAsRole, useViewAsRole } from '@/lib/auth/view-as'
import { canAccessAdminPath, isAdmin } from '@/lib/auth/permissions'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

type NavGroup = {
  label?: string
  badge?: string
  adminOnly?: boolean
  items: { label: string; href: string; icon: React.ElementType }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Tareas', href: '/tareas', icon: CheckSquare },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { label: 'Instagram', href: '/instagram', icon: Camera },
      { label: 'YouTube', href: '/youtube', icon: Play },
      { label: 'TikTok', href: '/tiktok', icon: Music },
      { label: 'Ads', href: '/ads', icon: Megaphone },
    ],
  },
  {
    label: 'CREAR',
    items: [
      { label: 'Estudio', href: '/contenido', icon: Kanban },
      { label: 'Bases del negocio', href: '/bases', icon: BookOpen },
    ],
  },
  {
    label: 'INVESTIGACIÓN',
    items: [
      { label: 'Competidores', href: '/competidores', icon: Users },
      { label: 'Investigar Canal', href: '/content-research', icon: Telescope },
      { label: 'Transcript', href: '/transcript', icon: FileText },
    ],
  },
  {
    label: 'ADMIN',
    adminOnly: true,
    items: [
      { label: 'Resumen', href: '/admin', icon: Shield },
      { label: 'Usuarios', href: '/admin/users', icon: UserCog },
    ],
  },
]

const VIEW_AS_OPTIONS = [
  { value: 'team',   label: 'Team' },
  { value: 'setter', label: 'Setter' },
  { value: 'client', label: 'Client' },
] as const

export function Sidebar({ collapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()
  const { profile, sessionError, setProfileFields } = useAuth()

  const actualRole = profile?.role ?? null
  const effectiveRole = useEffectiveRole(actualRole)
  const viewAs = useViewAsRole()

  const clientName = profile?.clientName ?? null
  const userEmail = profile?.email ?? null
  const displayName = profile?.displayName ?? null
  const avatarUrl = profile?.avatarUrl ?? null

  const visibleGroups = NAV_GROUPS.filter((g) => {
    if (!g.adminOnly) return true
    return canAccessAdminPath(effectiveRole, '/admin')
  })

  const candidateHrefs = visibleGroups.flatMap((g) => g.items.map((i) => i.href))
  const matchingHrefs = candidateHrefs.filter(
    (h) => pathname === h || (h !== '/' && pathname.startsWith(h + '/')),
  )
  const activeHref =
    matchingHrefs.length > 0
      ? matchingHrefs.sort((a, b) => b.length - a.length)[0]
      : null

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-overlay bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? 'Menú de navegación' : undefined}
        onClick={(e) => {
          if (mobileOpen && (e.target as HTMLElement).closest('a')) onMobileClose?.()
        }}
        className={cn(
          'fixed left-0 top-0 h-full z-modal flex flex-col p-3 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0'
        )}
        style={{
          width: collapsed ? '80px' : '240px',
          transition: 'width 300ms cubic-bezier(0.4,0,0.2,1), transform 300ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
      {/* Floating card */}
      <div
        className="flex-1 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--sidebar)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header: logo + collapse toggle */}
        <div
          className="flex items-center justify-between px-3 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {collapsed ? (
            <div className="flex justify-center w-full">
              <button
                onClick={onToggle}
                aria-label="Expandir menú"
                title="Expandir menú"
                className="group/logo relative w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs cursor-pointer overflow-hidden transition-transform hover:scale-105"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <span className="transition-opacity duration-150 group-hover/logo:opacity-0">E</span>
                <ChevronRight
                  size={14}
                  className="absolute opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100"
                />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  E
                </div>
                <div className="min-w-0 overflow-hidden">
                  <p className="text-xs font-semibold leading-tight truncate" style={{ color: 'var(--foreground)' }}>
                    Content Dashboard
                  </p>
                  <p className="text-[10px] leading-tight" style={{ color: 'var(--muted-foreground)' }}>
                    {clientName ? `by ${clientName}` : 'by eternity'}
                  </p>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity cursor-pointer"
                style={{ color: 'var(--muted-foreground)' }}
                title="Colapsar"
              >
                <ChevronLeft size={14} />
              </button>
              {mobileOpen && (
                <button
                  onClick={onMobileClose}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity cursor-pointer md:hidden"
                  style={{ color: 'var(--muted-foreground)' }}
                  aria-label="Cerrar menú"
                  title="Cerrar menú"
                >
                  <ChevronLeft size={14} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto py-3 space-y-4',
            collapsed ? 'px-0' : 'px-2'
          )}
          style={{ scrollbarWidth: 'none' }}
        >
          {visibleGroups.map((group, gIdx) => (
            <div key={group.label ?? gIdx}>
              {group.label && (
                <div
                  className="flex items-center gap-2 px-2 mb-1 overflow-hidden"
                  style={{
                    maxHeight: collapsed ? '0px' : '24px',
                    opacity: collapsed ? 0 : 1,
                    transition: 'max-height 250ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease',
                    pointerEvents: collapsed ? 'none' : 'auto',
                  }}
                >
                  <span
                    className="text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap"
                    style={{ color: 'var(--muted-foreground)', opacity: 0.45 }}
                  >
                    {group.label}
                  </span>
                  {group.badge && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                      style={{
                        color: 'var(--color-eternity-gold)',
                        border: '1px solid color-mix(in srgb, var(--color-eternity-gold) 33%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--color-eternity-gold) 7%, transparent)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {group.badge}
                    </span>
                  )}
                </div>
              )}

              <div className={collapsed ? 'flex flex-col items-center gap-1' : 'space-y-0.5'}>
                {group.items.map(({ label, href, icon: Icon }) => {
                  const active = href === activeHref
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      aria-label={collapsed ? label : undefined}
                      className={cn(
                        'relative flex items-center text-sm cursor-pointer',
                        collapsed
                          ? 'w-10 h-10 justify-center rounded-xl'
                          : 'gap-3 px-3 py-2.5 rounded-xl',
                        !active && 'hover:opacity-80 transition-opacity'
                      )}
                      style={{ color: active ? 'var(--sidebar-active-fg, var(--accent-foreground))' : 'var(--muted-foreground)' }}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-active-bg"
                          className="absolute inset-0 rounded-xl sidebar-active-pill"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      <Icon
                        size={collapsed ? 18 : 16}
                        style={{ color: active ? 'var(--sidebar-active-fg, var(--accent-foreground))' : 'inherit', flexShrink: 0, position: 'relative' }}
                      />
                      {!collapsed && (
                        <span
                          style={{
                            fontWeight: active ? 500 : 400,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            maxWidth: '160px',
                            opacity: 1,
                            transition: 'max-width 250ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease',
                            position: 'relative',
                          }}
                        >
                          {label}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: view-as (admin only) + user menu + sign out */}
        <div className="px-2 py-3 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          {sessionError && !collapsed && (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="block rounded-lg px-3 py-2 text-[11px] text-center font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              Sesión expirada — volver a entrar
            </Link>
          )}

          {/* View-As toggle — solo visible para admin, solo en sidebar expandido */}
          {isAdmin(actualRole) && !collapsed && (
            <div
              className="rounded-xl px-3 py-2 space-y-1.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <Eye size={11} style={{ color: 'var(--muted-foreground)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
                  Ver como
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {VIEW_AS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setViewAsRole(viewAs === opt.value ? null : opt.value)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                    style={viewAs === opt.value
                      ? { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }
                      : { backgroundColor: 'transparent', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
                {viewAs && (
                  <button
                    onClick={() => setViewAsRole(null)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium transition-opacity hover:opacity-70 cursor-pointer"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          <UserMenu
            email={userEmail}
            role={effectiveRole}
            displayName={displayName}
            avatarUrl={avatarUrl}
            collapsed={collapsed}
            onProfileChange={({ displayName: n, avatarUrl: a }) => {
              setProfileFields({ displayName: n, avatarUrl: a })
            }}
          />
          {!collapsed && (
            <button
              onClick={onToggle}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs hover:opacity-70 transition-opacity cursor-pointer"
              style={{ color: 'var(--muted-foreground)' }}
              title="Colapsar menú"
            >
              <ChevronLeft size={14} />
              <span>Colapsar</span>
            </button>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              'w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:opacity-70 transition-opacity cursor-pointer justify-center',
            )}
            style={{ color: 'var(--muted-foreground)' }}
            title="Cerrar sesión"
          >
            <LogOut size={14} />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>
      </aside>
    </>
  )
}
