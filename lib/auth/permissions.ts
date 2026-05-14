export type UserRole = 'admin' | 'team' | 'setter' | 'client' | string | null | undefined

// Rutas /admin accesibles por team (no pueden gestionar usuarios ni clientes)
export const TEAM_ALLOWED_ADMIN_PATHS = [
  '/admin',
] as const

// Setter no accede a ninguna ruta /admin
export const SETTER_ALLOWED_ADMIN_PATHS: readonly string[] = []

// Landing default por rol después del login
export const ADMIN_DEFAULT_LANDING  = '/admin/users'
export const TEAM_DEFAULT_LANDING   = '/'
export const SETTER_DEFAULT_LANDING = '/'
export const CLIENT_DEFAULT_LANDING = '/'

export function normalizeRole(role: UserRole): 'admin' | 'team' | 'setter' | 'client' {
  const r = String(role ?? '').toLowerCase()
  if (r === 'admin')  return 'admin'
  if (r === 'team')   return 'team'
  if (r === 'setter') return 'setter'
  return 'client'
}

export function isAdmin(role: UserRole):    boolean { return normalizeRole(role) === 'admin' }
export function isTeam(role: UserRole):     boolean { return normalizeRole(role) === 'team' }
export function isSetter(role: UserRole):   boolean { return normalizeRole(role) === 'setter' }
export function isClient(role: UserRole):   boolean { return normalizeRole(role) === 'client' }
export function isInternal(role: UserRole): boolean {
  const r = normalizeRole(role)
  return r === 'admin' || r === 'team' || r === 'setter'
}

export function canAccessAdminPath(role: UserRole, path: string): boolean {
  if (isAdmin(role)) return true
  if (isTeam(role))
    return TEAM_ALLOWED_ADMIN_PATHS.some((a) => path === a || path.startsWith(a + '/'))
  if (isSetter(role))
    return SETTER_ALLOWED_ADMIN_PATHS.some((a) => path === a || path.startsWith(a + '/'))
  return false
}

export function getDefaultLandingForRole(role: UserRole): string {
  const r = normalizeRole(role)
  if (r === 'admin')  return ADMIN_DEFAULT_LANDING
  if (r === 'team')   return TEAM_DEFAULT_LANDING
  if (r === 'setter') return SETTER_DEFAULT_LANDING
  return CLIENT_DEFAULT_LANDING
}
