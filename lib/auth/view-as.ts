'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'contentDashboard.viewAsRole'
const EVENT_NAME  = 'contentDashboard.viewAsRole.change'

export type ViewAsRole = 'team' | 'setter' | 'client' | null

function readStorage(): ViewAsRole {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(STORAGE_KEY)
  if (v === 'team' || v === 'setter' || v === 'client') return v
  return null
}

export function setViewAsRole(role: ViewAsRole) {
  if (typeof window === 'undefined') return
  if (role) {
    window.localStorage.setItem(STORAGE_KEY, role)
  } else {
    window.localStorage.removeItem(STORAGE_KEY)
  }
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function useViewAsRole(): ViewAsRole {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT_NAME, cb)
      window.addEventListener('storage', cb)
      return () => {
        window.removeEventListener(EVENT_NAME, cb)
        window.removeEventListener('storage', cb)
      }
    },
    readStorage,
    () => null,
  )
}

/**
 * Devuelve el rol efectivo: view-as si está activo y el usuario real es admin,
 * o el rol real en cualquier otro caso.
 * Solo afecta la UI — los fetches siguen usando el JWT real del admin.
 */
export function useEffectiveRole(actualRole: string | null): string | null {
  const viewAs = useViewAsRole()
  if (!viewAs) return actualRole
  if (String(actualRole ?? '').toLowerCase() !== 'admin') return actualRole
  return viewAs
}
