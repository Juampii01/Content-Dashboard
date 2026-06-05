'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ImageIcon, Film, Images, Clock3, Loader2, CheckCircle, XCircle, ExternalLink,
  PlusCircle, UploadCloud, X, Clock, AlertCircle,
} from 'lucide-react'
import { IG_GRADIENT_CSS, IG_GRADIENT } from './ig-theme'
import { useInstagramPublish, type PublishKind } from '@/hooks/useInstagramPublish'
import { toast } from 'sonner'

interface Post {
  id: string
  mediaType: string
  caption: string | null
  status: string
  permalink: string | null
  postId: string | null
  createdAt: string
  errorMessage?: string | null
}
interface Limit { quota_usage: number; quota_total: number }

const KINDS: { id: PublishKind | 'STORIES'; label: string; icon: React.ElementType; multi?: boolean; disabled?: boolean }[] = [
  { id: 'IMAGE',    label: 'Imagen',   icon: ImageIcon },
  { id: 'REEL',     label: 'Reel',     icon: Film },
  { id: 'CAROUSEL', label: 'Carrusel', icon: Images, multi: true },
  { id: 'STORIES',  label: 'Stories',  icon: Clock3, disabled: true },
]

const ACCEPT: Record<PublishKind, string> = {
  IMAGE: 'image/jpeg,image/png',
  REEL: 'video/mp4,video/quicktime',
  CAROUSEL: 'image/jpeg,image/png,video/mp4,video/quicktime',
}

export function IGPublishPanel() {
  const [kind, setKind] = useState<PublishKind>('IMAGE')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [posts, setPosts] = useState<Post[]>([])
  const [limit, setLimit] = useState<Limit | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    fetch('/api/instagram/publish')
      .then(r => r.ok ? r.json() : { posts: [], limit: null })
      .then(d => { setPosts((d.posts ?? []) as Post[]); setLimit(d.limit ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  useEffect(() => { reload() }, [reload])

  const { state, run, reset } = useInstagramPublish(reload)
  const busy = state.phase === 'validating' || state.phase === 'uploading' || state.phase === 'publishing'

  // Build object-URL previews; revoke on change/unmount
  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [files])

  const multi = kind === 'CAROUSEL'

  function addFiles(list: FileList | null) {
    if (!list || !list.length) return
    const incoming = Array.from(list)
    setFiles(prev => multi ? [...prev, ...incoming].slice(0, 10) : [incoming[0]])
    reset()
  }
  function removeFile(i: number) { setFiles(prev => prev.filter((_, idx) => idx !== i)) }

  function switchKind(k: PublishKind) {
    setKind(k); setFiles([]); reset()
  }

  const quotaPct = limit ? Math.min(100, (limit.quota_usage / limit.quota_total) * 100) : 0
  const quotaReached = limit ? limit.quota_usage >= limit.quota_total : false

  async function onPublish() {
    if (!files.length || busy) return
    const ok = await run({ kind, files, caption: caption.trim() })
    if (ok) { toast.success('¡Publicado en Instagram!'); setFiles([]); setCaption(''); setTimeout(reset, 1500) }
    else toast.error(state.message || 'Error al publicar')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── Composer ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="px-5 pt-5 pb-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Nueva publicación</h3>

          {/* Kind selector */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {KINDS.map(({ id, label, icon: Icon, disabled }) => {
              const active = id === kind
              return (
                <button
                  key={id}
                  onClick={() => !disabled && switchKind(id as PublishKind)}
                  disabled={disabled || busy}
                  title={disabled ? 'Próximamente' : undefined}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${active ? IG_GRADIENT_CSS + ' text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                >
                  <Icon size={14} />
                  {label}{disabled && <span className="text-[10px] opacity-70">· pronto</span>}
                </button>
              )
            })}
          </div>

          {/* Dropzone */}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT[kind]}
            multiple={multi}
            className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = '' }}
          />
          {files.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
              className={`w-full rounded-xl border-2 border-dashed transition-colors py-10 flex flex-col items-center justify-center gap-2 ${dragOver ? 'border-[var(--foreground)] bg-[var(--muted)]' : 'border-[var(--border)] hover:border-[var(--muted-foreground)]'}`}
            >
              <UploadCloud size={28} className="text-[var(--muted-foreground)]" />
              <span className="text-sm text-[var(--foreground)] font-medium">
                {multi ? 'Arrastrá 2–10 archivos o hacé click' : 'Arrastrá un archivo o hacé click'}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {kind === 'REEL' ? 'MP4/MOV vertical · 3–90s · ≤100MB'
                  : kind === 'IMAGE' ? 'JPG/PNG · aspect 0.8–1.91 · ≤8MB'
                  : 'Imágenes y/o videos · hasta 10'}
              </span>
            </button>
          ) : (
            <div className={`grid gap-2 ${multi ? 'grid-cols-4' : 'grid-cols-1'}`}>
              {files.map((f, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden bg-[var(--muted)] aspect-square">
                  {f.type.startsWith('video/')
                    ? <video src={previews[i]} className="w-full h-full object-cover" muted />
                    : <img src={previews[i]} alt="" className="w-full h-full object-cover" />}
                  {!busy && (
                    <button onClick={() => removeFile(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80">
                      <X size={13} />
                    </button>
                  )}
                  {f.type.startsWith('video/') && <Film size={14} className="absolute bottom-1 left-1 text-white drop-shadow" />}
                </div>
              ))}
              {multi && files.length < 10 && !busy && (
                <button onClick={() => inputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--muted-foreground)] flex items-center justify-center text-[var(--muted-foreground)]">
                  <PlusCircle size={20} />
                </button>
              )}
            </div>
          )}

          {/* Caption */}
          <div className="mt-4 mb-4">
            <label className="text-xs text-[var(--muted-foreground)] mb-1.5 flex items-center justify-between">
              <span>Caption</span>
              <span className={caption.length > 2000 ? 'text-red-500' : ''}>{caption.length}/2200</span>
            </label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={3} maxLength={2200} disabled={busy}
              placeholder="Escribí el caption…"
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--muted-foreground)] transition-colors resize-none disabled:opacity-60"
            />
          </div>

          {/* Real quota */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[var(--muted-foreground)]">Cuota de Instagram (24h)</span>
              <span className="text-xs font-semibold text-[var(--foreground)]">
                {limit ? `${limit.quota_usage}/${limit.quota_total}` : '—'}
              </span>
            </div>
            <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: quotaPct + '%', background: quotaPct > 80 ? '#FD1D1D' : IG_GRADIENT }} />
            </div>
          </div>

          {/* Progress / status while running */}
          {busy && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs text-[var(--foreground)] mb-1.5">
                <Loader2 size={13} className="animate-spin" /> {state.message}
              </div>
              {state.phase === 'uploading' && (
                <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: state.progress + '%', background: IG_GRADIENT }} />
                </div>
              )}
            </div>
          )}
          {state.phase === 'error' && (
            <div className="mb-4 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {state.message}
            </div>
          )}

          <button
            onClick={() => void onPublish()}
            disabled={!files.length || busy || quotaReached}
            className={`w-full h-11 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 ${IG_GRADIENT_CSS}`}
          >
            {busy
              ? <><Loader2 size={16} className="animate-spin" /> {state.phase === 'uploading' ? `Subiendo… ${state.progress}%` : 'Procesando…'}</>
              : quotaReached
              ? <>Cuota diaria alcanzada</>
              : <><PlusCircle size={16} /> Publicar en Instagram</>}
          </button>
        </div>
      </div>

      {/* ── History ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Historial reciente</h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-[var(--muted)] rounded-xl animate-pulse" />)}</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">No hay publicaciones aún</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {posts.slice(0, 10).map(post => (
              <div key={post.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${post.status === 'PUBLISHED' ? 'bg-emerald-500/20' : post.status === 'FAILED' ? 'bg-red-500/20' : 'bg-[var(--muted)]'}`}>
                  {post.status === 'PUBLISHED' ? <CheckCircle size={14} className="text-emerald-500" />
                    : post.status === 'FAILED' ? <XCircle size={14} className="text-red-500" />
                    : <Clock size={14} className="text-[var(--muted-foreground)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--foreground)] truncate">
                    {post.caption || <span className="italic text-[var(--muted-foreground)]">Sin caption</span>}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(post.createdAt).toLocaleDateString('es-AR')} · {post.mediaType}
                    {post.status === 'FAILED' && post.errorMessage && (
                      <span className="text-red-400 ml-1" title={post.errorMessage}>· {post.errorMessage.slice(0, 50)}</span>
                    )}
                  </p>
                </div>
                {post.status === 'PUBLISHED' && (post.permalink ?? post.postId) && (
                  <a href={post.permalink ?? 'https://www.instagram.com/p/' + post.postId + '/'} target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex-shrink-0">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
