/**
 * Client-side error surfacing helper.
 *
 * Unified pattern: log to console + optionally toast the user. Replaces the
 * previous endemic `.catch(() => {})` swallows that hid real failures (incl.
 * /api/me 500s that manifested as "perdí super admin" symptom).
 *
 * Usage:
 *   import { logClientError } from '@/lib/client-errors'
 *   fetch('/api/x').catch((err) => logClientError(err, 'HomeContent:fetchIdeas'))
 *
 * For silent "fire-and-forget" paths (e.g. optimistic telemetry) pass
 * `{ silent: true }` — it still logs to console so debugging stays possible.
 */
import { toast } from 'sonner'

export interface LogClientErrorOptions {
  /** When true, does not show a toast. Still logs to console. */
  silent?: boolean
  /** Human-readable message for the user. Defaults to the error.message. */
  userMessage?: string
}

export function logClientError(
  err: unknown,
  context: string,
  opts: LogClientErrorOptions = {},
): void {
  const message = err instanceof Error ? err.message : String(err)

  // Ignore abort errors from AbortController cleanup — these are intentional.
  if (err instanceof Error && err.name === 'AbortError') return

  // Console is always noisy so devs see everything locally and in prod logs.
  console.error(`[client-error] ${context}:`, err)

  if (opts.silent) return

  const userMessage = opts.userMessage ?? toFriendlyMessage(message)
  toast.error(userMessage)
}

function toFriendlyMessage(raw: string): string {
  // Keep dev-side errors terse but readable.
  if (raw.includes('Failed to fetch')) return 'Sin conexión al servidor'
  if (raw.startsWith('Error 401') || raw === 'UNAUTHORIZED') return 'Sesión expirada, vuelve a iniciar sesión'
  if (raw.startsWith('Error 403') || raw === 'FORBIDDEN') return 'No tienes acceso a este recurso'
  if (raw.startsWith('Error 5')) return 'Error interno del servidor'
  // Default: show the raw message when it's short enough; otherwise generic.
  return raw.length < 120 ? raw : 'Error inesperado'
}
