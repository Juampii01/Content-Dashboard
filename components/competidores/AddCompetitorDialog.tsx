'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrapeProgressDialog } from '@/components/competidores/ScrapeProgressDialog'
import type { CreateCompetitorResponse } from '@/lib/types/competidores'
import { addActive } from '@/lib/competidores/active-jobs'

type Limit = 10 | 20 | 30

const LIMIT_OPTIONS: { value: Limit; label: string; cost: string }[] = [
  { value: 10, label: '10 reels', cost: '~$0.01' },
  { value: 20, label: '20 reels', cost: '~$0.02' },
  { value: 30, label: '30 reels', cost: '~$0.03' },
]

interface AddCompetitorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDismiss: () => void
}

export function AddCompetitorDialog({ open, onOpenChange, onDismiss }: AddCompetitorDialogProps) {
  const [username, setUsername] = useState('')
  const [limit, setLimit] = useState<Limit>(10)
  const [loading, setLoading] = useState(false)

  // ScrapeProgressDialog state
  const [progressOpen, setProgressOpen] = useState(false)
  const [jobId, setJobId] = useState('')
  const [scrapedUsername, setScrapedUsername] = useState('')

  function extractHandle(raw: string): string {
    const trimmed = raw.trim()
    const urlMatch = trimmed.match(/(?:instagram\.com\/)([a-zA-Z0-9._]+)/)
    if (urlMatch) return urlMatch[1]
    return trimmed.replace(/^@+/, '').replace(/\/+$/, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const handle = extractHandle(username)
    if (!handle) return

    setLoading(true)
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: handle, limit }),
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? `Error ${res.status}`)
      }

      const data = (await res.json()) as CreateCompetitorResponse
      setJobId(data.jobId)
      setScrapedUsername(handle)

      // Persist job so it can be resumed if the tab is closed
      addActive({ jobId: data.jobId, username: handle, requestedCount: limit, kind: 'initial', startedAt: new Date().toISOString() })

      // Close add dialog, open progress dialog
      onOpenChange(false)
      setProgressOpen(true)
      setUsername('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al añadir competidor')
    } finally {
      setLoading(false)
    }
  }

  function handleProgressClose() {
    setProgressOpen(false)
    onDismiss()
  }

  const selectedLimitOption = LIMIT_OPTIONS.find((o) => o.value === limit)!

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir competidor</DialogTitle>
            <DialogDescription>
              Introduce el username de Instagram para scrapear sus reels.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
            {/* Username input */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username o URL de Instagram"
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--foreground)' }}
                disabled={loading}
              />
            </div>

            {/* Limit segmented control */}
            <div>
              <p className="text-xs mb-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>
                Número de reels
              </p>
              <div
                className="flex rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
              >
                {LIMIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLimit(opt.value)}
                    className="flex-1 text-xs px-3 py-2.5 font-medium transition-all"
                    style={{
                      backgroundColor: limit === opt.value ? 'var(--accent)' : 'var(--muted)',
                      color: limit === opt.value ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost estimate badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Costo estimado de scraping
              </span>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                }}
              >
                {selectedLimitOption.cost}
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !username.trim()}
              >
                {loading ? (
                  <><Loader2 size={13} className="animate-spin" /> Iniciando…</>
                ) : (
                  <><Plus size={13} /> Añadir</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Progress dialog — shown after add dialog closes */}
      {progressOpen && (
        <ScrapeProgressDialog
          open={progressOpen}
          jobId={jobId}
          username={scrapedUsername}
          requestedCount={limit}
          onClose={handleProgressClose}
        />
      )}
    </>
  )
}
