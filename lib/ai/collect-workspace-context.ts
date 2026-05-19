/**
 * Fetches workspace context from the server (Prisma-backed) and returns a plain
 * WorkspaceContext object ready to POST to /api/ai/chat.
 *
 * Bases (ICP + business bases) now come from /api/bases/context (Prisma).
 * Tasks come from /api/tasks (Prisma).
 * Reels come from /api/reels/context (UserReel model, Prisma).
 */

import type { WorkspaceContext } from '@/lib/schemas/ai'

async function fetchTasks(): Promise<WorkspaceContext['tareas']> {
  try {
    const res = await fetch('/api/tasks')
    if (!res.ok) return []
    const data = (await res.json()) as {
      tasks: { title: string; columnId: string; dueDate: string | null }[]
    }
    if (!Array.isArray(data.tasks)) return []
    return data.tasks
      .map((t) => {
        const title    = typeof t.title    === 'string' ? t.title    : null
        const columnId = typeof t.columnId === 'string' ? t.columnId : null
        if (!title || !columnId) return null
        return {
          title,
          columnId,
          dueDate: t.dueDate ?? undefined,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  } catch {
    return []
  }
}

async function fetchReels(): Promise<WorkspaceContext['reels']> {
  // TODO: wire up a real /api/reels/context endpoint that queries
  // db.userReel.findMany({ where: { clientId }, take: 10, orderBy: { createdAt: 'desc' } })
  // and maps UserReel fields to the WorkspaceContext reel shape.
  // For now, return empty so mock data is no longer used.
  return []
}

export async function collectWorkspaceContext(): Promise<WorkspaceContext> {
  let basesContext: {
    icp?: string
    oferta?: string
    problemas?: string[]
    dolores?: string[]
    deseos?: string[]
    insights?: string[]
  } = {}

  const [tareas, reels] = await Promise.all([
    fetchTasks(),
    fetchReels(),
    fetch('/api/bases/context')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => { basesContext = d })
      .catch(() => {}),
  ])

  return {
    icp:       basesContext.icp,
    oferta:    basesContext.oferta,
    problemas: basesContext.problemas ?? [],
    dolores:   basesContext.dolores   ?? [],
    deseos:    basesContext.deseos    ?? [],
    insights:  basesContext.insights  ?? [],
    tareas,
    reels,
  }
}
