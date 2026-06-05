'use client'

/**
 * Client-side upload to the public `instagram-uploads` Supabase Storage bucket.
 *
 * Why client-side: Vercel serverless functions cap request bodies at ~4.5MB, so a
 * video can't be POSTed through an API route. The browser uploads straight to
 * Storage (with real byte progress via XHR), and the publish route only ever
 * receives the resulting public URLs (small JSON). Meta then pulls the file by URL.
 */

import { createClient } from '@/lib/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BUCKET = 'instagram-uploads'

function extFor(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  if (fromName) return fromName
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'video/quicktime') return 'mov'
  return 'mp4'
}

export interface UploadResult {
  url: string
  itemType: 'IMAGE' | 'VIDEO'
}

/** Uploads `file` and resolves with its public URL. Calls `onProgress(0..100)`. */
export async function uploadToInstagramBucket(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sesión expirada — volvé a iniciar sesión')

  const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(file)}`
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint, true)
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
    xhr.setRequestHeader('apikey', ANON_KEY)
    xhr.setRequestHeader('x-upsert', 'true')
    xhr.setRequestHeader('cache-control', '3600')
    if (file.type) xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress?.(100); resolve() }
      else reject(new Error(`Upload falló (HTTP ${xhr.status}): ${xhr.responseText?.slice(0, 200)}`))
    }
    xhr.onerror = () => reject(new Error('Error de red durante la subida'))
    xhr.send(file)
  })

  return {
    url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`,
    itemType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
  }
}
