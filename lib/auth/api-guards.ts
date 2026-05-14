import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { isAdmin, isInternal } from '@/lib/auth/permissions'
import type { User } from '@supabase/supabase-js'

async function getProfileCtx(): Promise<{ user: User; role: string } | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const profile = await db.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  if (!profile) return null

  return { user, role: profile.role }
}

/**
 * Verifica que el usuario sea ADMIN.
 * Devuelve el User de Supabase o null si no autorizado.
 */
export async function requireAdmin(): Promise<User | null> {
  const ctx = await getProfileCtx()
  if (!ctx || !isAdmin(ctx.role)) return null
  return ctx.user
}

/**
 * Verifica que el usuario sea ADMIN, TEAM o SETTER.
 * Devuelve el User de Supabase o null si no autorizado.
 */
export async function requireInternal(): Promise<User | null> {
  const ctx = await getProfileCtx()
  if (!ctx || !isInternal(ctx.role)) return null
  return ctx.user
}
