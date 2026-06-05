'use client'

import { useState, useCallback } from 'react'
import { uploadToInstagramBucket } from '@/lib/instagram/upload'

export type PublishKind = 'IMAGE' | 'REEL' | 'CAROUSEL'
export type PublishPhase = 'idle' | 'validating' | 'uploading' | 'publishing' | 'done' | 'error'

interface PublishState {
  phase: PublishPhase
  progress: number       // 0..100 (upload)
  message: string        // human-readable current step / error
}

const IMG_TYPES = ['image/jpeg', 'image/png']
const VID_TYPES = ['video/mp4', 'video/quicktime']
const IMG_MAX = 8 * 1024 * 1024
const VID_MAX = 100 * 1024 * 1024

function readImageMeta(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')) }
    img.src = url
  })
}

function readVideoMeta(file: File): Promise<{ w: number; h: number; dur: number }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(file)
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve({ w: v.videoWidth, h: v.videoHeight, dur: v.duration }) }
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer el video')) }
    v.src = url
  })
}

/** Fail-fast client-side validation. Returns an error string, or null if valid. */
export async function validateMedia(file: File, kind: PublishKind, isCarouselItem = false): Promise<string | null> {
  const isVideo = file.type.startsWith('video/')

  if (kind === 'IMAGE' && isVideo) return 'Para Imagen subí un JPG o PNG, no un video.'
  if (kind === 'REEL' && !isVideo) return 'Para Reel subí un video MP4 o MOV.'

  if (isVideo) {
    if (!VID_TYPES.includes(file.type)) return 'Formato de video no soportado (usá MP4 o MOV).'
    if (file.size > VID_MAX) return `El video supera 100MB (${(file.size / 1024 / 1024).toFixed(0)}MB).`
    const { w, h, dur } = await readVideoMeta(file)
    if (!isCarouselItem) {
      if (dur < 3 || dur > 90) return `La duración debe ser 3–90s (tiene ${dur.toFixed(0)}s).`
      const aspect = w / h
      if (aspect > 0.6) return 'El Reel debe ser vertical (~9:16).'
      if (h < 540) return `Resolución muy baja (${w}×${h}); mínimo 540p.`
    }
    return null
  }

  if (!IMG_TYPES.includes(file.type)) return 'Formato de imagen no soportado (usá JPG o PNG).'
  if (file.size > IMG_MAX) return `La imagen supera 8MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`
  const { w, h } = await readImageMeta(file)
  const aspect = w / h
  if (aspect < 0.8 || aspect > 1.91) return `Aspect ratio fuera de rango (${aspect.toFixed(2)}); permitido 0.8–1.91.`
  return null
}

interface PublishArgs {
  kind: PublishKind
  files: File[]               // 1 for IMAGE/REEL, 2..10 for CAROUSEL
  caption: string
}

export function useInstagramPublish(onPublished?: () => void) {
  const [state, setState] = useState<PublishState>({ phase: 'idle', progress: 0, message: '' })

  const reset = useCallback(() => setState({ phase: 'idle', progress: 0, message: '' }), [])

  const run = useCallback(async ({ kind, files, caption }: PublishArgs): Promise<boolean> => {
    try {
      // 1) validate every file (fail fast, before uploading anything)
      setState({ phase: 'validating', progress: 0, message: 'Validando archivos…' })
      if (kind === 'CAROUSEL' && (files.length < 2 || files.length > 10))
        throw new Error('El carrusel necesita entre 2 y 10 elementos.')
      for (const f of files) {
        const err = await validateMedia(f, kind, kind === 'CAROUSEL')
        if (err) throw new Error(err)
      }

      // 2) upload sequentially with combined progress
      const urls: string[] = []
      const itemTypes: ('IMAGE' | 'VIDEO')[] = []
      for (let i = 0; i < files.length; i++) {
        setState({ phase: 'uploading', progress: 0, message: `Subiendo ${i + 1}/${files.length}…` })
        const res = await uploadToInstagramBucket(files[i], (pct) =>
          setState({ phase: 'uploading', progress: pct, message: `Subiendo ${i + 1}/${files.length}… ${pct}%` }))
        urls.push(res.url)
        itemTypes.push(res.itemType)
      }

      // 3) publish via API route
      setState({ phase: 'publishing', progress: 100, message: kind === 'IMAGE' ? 'Publicando…' : 'Procesando en Instagram…' })
      const resp = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaType: kind, mediaUrls: urls, itemTypes: kind === 'CAROUSEL' ? itemTypes : undefined, caption }),
      })
      const data = await resp.json().catch(() => ({})) as { error?: string; detail?: string }
      if (!resp.ok) throw new Error(data.detail || data.error || 'Error al publicar')

      setState({ phase: 'done', progress: 100, message: '¡Publicado!' })
      onPublished?.()
      return true
    } catch (e) {
      setState({ phase: 'error', progress: 0, message: e instanceof Error ? e.message : 'Error desconocido' })
      return false
    }
  }, [onPublished])

  return { state, run, reset }
}
