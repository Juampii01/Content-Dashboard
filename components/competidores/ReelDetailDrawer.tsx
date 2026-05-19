'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCcw, ExternalLink, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ReelTab } from '@/components/competidores/ReelTab'
import { TranscribeSection } from '@/components/competidores/TranscribeSection'
import { AnalysisSection } from '@/components/competidores/AnalysisSection'
import { ChatSection } from '@/components/competidores/ChatSection'
import type {
  ReelDTO,
  TranscriptionDTO,
  AnalysisDTO,
  GetReelResponse,
} from '@/lib/types/competidores'

interface ReelDetailDrawerProps {
  reelId: string | null
  onClose: () => void
}

type DrawerTab = 'reel' | 'transcripcion' | 'analisis' | 'chat'

/**
 * Right-side drawer shell built on base-ui Dialog.
 * Props: { reelId: string | null; onClose: () => void }
 *
 * When reelId is null the dialog stays closed.
 * Fetches GET /api/reels/[reelId] on open; coordinates transcription/analysis
 * state across tabs so TranscribeSection and AnalysisSection share the same data.
 */
export function ReelDetailDrawer({ reelId, onClose }: ReelDetailDrawerProps) {
  const [reel, setReel] = useState<ReelDTO | null>(null)
  const [transcription, setTranscription] = useState<TranscriptionDTO | null>(null)
  const [analyses, setAnalyses] = useState<AnalysisDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DrawerTab>('reel')

  const isOpen = reelId !== null

  const fetchReel = useCallback(async (id: string, signal: AbortSignal) => {
    setLoading(true)
    setError(null)
    setReel(null)
    setTranscription(null)
    setAnalyses([])
    setActiveTab('reel')

    try {
      const res = await fetch(`/api/reels/${id}`, { signal, credentials: 'same-origin' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Error ${res.status}`)
      }

      const data = (await res.json()) as GetReelResponse
      setReel(data.reel)
      setTranscription(data.transcription)
      // Most recent first so analyses[0] is always the latest
      setAnalyses(
        [...data.analyses].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      )
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Error cargando reel'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch when reelId changes and is non-null; abort on cleanup
  useEffect(() => {
    if (!reelId) return
    const controller = new AbortController()
    void fetchReel(reelId, controller.signal)
    return () => controller.abort()
  }, [reelId, fetchReel])

  function handleTranscribed(t: TranscriptionDTO) {
    setTranscription(t)
  }

  function handleAnalyzed(a: AnalysisDTO) {
    setAnalyses((prev) => [a, ...prev])
  }

  function handleJumpToAnalysis() {
    setActiveTab('analisis')
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          style={{ transitionDuration: '150ms' }}
        />

        {/* Drawer panel */}
        <DialogPrimitive.Popup
          aria-modal
          className="fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden sm:w-[520px] sm:max-w-[92vw] sm:rounded-l-2xl data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
          style={{
            backgroundColor: 'var(--background)',
            borderLeft: '1px solid var(--border)',
            transitionDuration: '200ms',
          }}
        >
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div
            className="flex flex-shrink-0 items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {reel ? (
                <>
                  <span
                    className="truncate text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                    title={reel.shortcode}
                  >
                    {reel.shortcode}
                  </span>
                  <a
                    href={reel.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 rounded-full p-1 transition-opacity hover:opacity-70"
                    aria-label="Ver en Instagram"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <ExternalLink size={13} />
                  </a>
                </>
              ) : (
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Cargando…
                </span>
              )}
            </div>

            <DialogPrimitive.Close
              aria-label="Cerrar panel"
              className="competidores-hover-muted flex-shrink-0 rounded-lg p-1.5 transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
              onClick={onClose}
            >
              <X size={16} />
            </DialogPrimitive.Close>
          </div>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Loading state */}
            {loading && (
              <div className="flex-1 p-4 space-y-4 overflow-hidden">
                <div className="rounded-xl overflow-hidden aspect-video animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
                <div className="space-y-2">
                  <div className="h-3.5 w-3/4 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
                  <div className="h-3 w-full rounded animate-pulse" style={{ backgroundColor: 'var(--muted)', animationDelay: '60ms' }} />
                  <div className="h-3 w-5/6 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)', animationDelay: '120ms' }} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[1,2,3].map((i) => (
                    <div key={i} className="rounded-xl p-3 animate-pulse" style={{ backgroundColor: 'var(--muted)', animationDelay: `${i * 80}ms` }}>
                      <div className="h-4 w-12 rounded mx-auto mb-1" style={{ backgroundColor: 'var(--border)' }} />
                      <div className="h-2.5 w-16 rounded mx-auto" style={{ backgroundColor: 'var(--border)' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="flex flex-1 items-center justify-center p-6">
                <div
                  className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl p-6 text-center"
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <AlertCircle size={24} style={{ color: 'var(--destructive)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      Error al cargar el reel
                    </p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {error}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { if (reelId) { const c = new AbortController(); void fetchReel(reelId, c.signal) } }}
                  >
                    <RefreshCcw size={13} />
                    Reintentar
                  </Button>
                </div>
              </div>
            )}

            {/* Content with tabs */}
            {!loading && !error && reel && (
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as DrawerTab)}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div
                  className="flex-shrink-0 px-4 pt-2"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <TabsList className="w-full justify-start" variant="line">
                    <TabsTrigger value="reel">Reel</TabsTrigger>
                    <TabsTrigger value="transcripcion">Transcripción</TabsTrigger>
                    <TabsTrigger value="analisis">Análisis</TabsTrigger>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab panels — each scrolls independently */}
                <TabsContent value="reel" className="flex-1 overflow-y-auto">
                  <ReelTab reel={reel} />
                </TabsContent>

                <TabsContent value="transcripcion" className="flex-1 overflow-y-auto">
                  <TranscribeSection
                    reel={reel}
                    transcription={transcription}
                    onTranscribed={handleTranscribed}
                    onJumpToAnalysis={handleJumpToAnalysis}
                    onReelUpdated={(updatedReel) => setReel(updatedReel)}
                  />
                </TabsContent>

                <TabsContent value="analisis" className="flex-1 overflow-y-auto">
                  <AnalysisSection
                    reel={reel}
                    transcription={transcription}
                    analyses={analyses}
                    onAnalyzed={handleAnalyzed}
                  />
                </TabsContent>

                <TabsContent value="chat" className="flex-1 overflow-hidden">
                  <ChatSection
                    reel={reel}
                    transcription={transcription}
                    analyses={analyses}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
