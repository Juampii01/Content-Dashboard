/**
 * Fetches workspace context from the server (Prisma-backed) and returns a plain
 * WorkspaceContext object ready to POST to /api/ai/chat.
 *
 * Bases (ICP + business bases) now come from /api/bases/context (Prisma).
 * Tasks come from /api/tasks (Prisma).
 * Reels come from mock data until Instagram Graph API is wired up.
 */

import type { WorkspaceContext } from '@/lib/schemas/ai'
import { REELS } from '@/lib/mock-data/reels'

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

function collectReels(): WorkspaceContext['reels'] {
  // Hasta que exista Instagram Graph API, el "workspace" del usuario usa
  // los reels mock definidos en lib/mock-data/reels.ts. Son datos ficticios
  // pero permiten que Eternity AI demuestre el flujo end-to-end.
  return REELS.map((r) => ({
    title:       r.title,
    caption:     r.caption ?? undefined,
    publishedAt: r.publishedAt,
    views:       r.views,
    likes:       r.likes,
    comments:    r.comments,
    saves:       r.saves,
    shares:      r.shares,
    multiplier:  r.multiplier,
    isAd:        r.isAd,
  }))
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

  const [tareas] = await Promise.all([
    fetchTasks(),
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
    reels:     collectReels(),
  }
}
