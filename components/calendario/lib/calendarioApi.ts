import { ContentPiece, ContentTemplate } from '@/lib/types'

// ─── API helpers ──────────────────────────────────────────────────────────

export async function fetchAllItems(): Promise<ContentPiece[]> {
  const res = await fetch('/api/content')
  if (!res.ok) throw new Error('fetch failed')
  const data = await res.json() as { items: ContentPiece[] }
  return data.items
}

export async function fetchTemplates(type: 'reel' | 'historia'): Promise<ContentTemplate[]> {
  const res = await fetch(`/api/content/templates?type=${type}`)
  if (!res.ok) throw new Error('fetch failed')
  const data = await res.json() as { templates: ContentTemplate[] }
  return data.templates
}

export async function apiCreateItem(payload: Omit<ContentPiece, 'id' | 'createdAt'>): Promise<ContentPiece> {
  const res = await fetch('/api/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('create failed')
  const data = await res.json() as { item: ContentPiece }
  return data.item
}

export async function apiUpdateItem(id: string, payload: Partial<ContentPiece>): Promise<ContentPiece> {
  const res = await fetch(`/api/content/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('update failed')
  const data = await res.json() as { item: ContentPiece }
  return data.item
}

export async function apiDeleteItem(id: string): Promise<void> {
  const res = await fetch(`/api/content/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('delete failed')
}

export async function apiDeleteTemplate(id: string): Promise<void> {
  const res = await fetch(`/api/content/templates/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('delete template failed')
}
