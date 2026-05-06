/**
 * Supabase service-role admin client.
 *
 * Server-side only. Uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS and
 * allows reading auth.users. NEVER import this from client components.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — ' +
        'required for admin operations',
    )
  }
  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
