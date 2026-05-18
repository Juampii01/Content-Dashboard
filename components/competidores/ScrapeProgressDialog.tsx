'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { GetJobResponse } from '@/lib/types/competidores'
import { removeActive } from '@/lib/competidores/active-jobs'

interface ScrapeProgressDialogProps {
  open: boolean
  jobId: string
  username: string
  requestedCount: 10 | 20 | 30
  /** Called after dialog fully closes (failed or user dismissed after error) */
  onClose: () => void
}

function etaLabel(count: 10 | 20 | 30): string {
  if (count === 10) return '~20s'
  if (count === 20) return '~35s'
  return '~45s'
}

export function ScrapeProgressDialog({
  open,
  jobId,
  username,
  requestedCount,
  onClose,
}: ScrapeProgressDialogProps) {
  const router = useRouter()
  const [progressPct, setProgressPct] = useState(0)
  const [actualCount, setActualCount] = useState(0)
  const [status, setStatus] = useState<'pending' | 'running' | 'completed' | 'failed'>('pending')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!open || !jobId) return

    setProgressPct(0)
    setActualCount(0)
    setStatus('pending')
    setErrorMessage(null)

    async function pollJob() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { credentials: 'same-origin' })
        if (!res.ok) {
          const body = (await res.json()) as { error?: string }
          throw new Error(body.error ?? `Error ${res.status}`)
        }
        const data = (await res.json()) as GetJobResponse
        setProgressPct(data.progressPct)
        setActualCount(data.job.actualCount)
        setStatus(data.job.status)

        if (data.job.status === 'completed') {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          removeActive(jobId)
          toast.success(`@${username} scrapeado — ${data.job.actualCount} reels`)
          router.push(`/competidores/${encodeURIComponent(username)}`)
        } else if (data.job.status === 'failed') {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          removeActive(jobId)
          setErrorMessage(data.job.errorMessage ?? 'Error desconocido al scrapear')
          toast.error('Falló el scraping')
        }
      } catch (err) {
        // Network error — keep polling, don't abort
        console.error('[ScrapeProgressDialog] poll error:', err)
      }
    }

    // Immediate first poll
    void pollJob()
    intervalRef.current = setInterval(pollJob, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [open, jobId, username, router])

  const isDismissable = status === 'failed'

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Only allow close when failed (non-dismissable while running/pending)
        if (!nextOpen && isDismissable) {
          onClose()
        }
      }}
    >
      <DialogContent showCloseButton={isDismissable}>
        <DialogHeader>
          <DialogTitle>
            {status === 'failed' ? 'Error en el scraping' : `Scrapeando @${username}`}
          </DialogTitle>
          <DialogDescription>
            {status === 'failed'
              ? 'Ocurrió un error. Puedes intentarlo de nuevo.'
              : `Obteniendo hasta ${requestedCount} reels · ETA ${etaLabel(requestedCount)}`}
          </DialogDescription>
        </DialogHeader>

        {status !== 'failed' && (
          <div className="flex flex-col gap-4 pt-1">
            {/* Progress bar */}
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: 'var(--accent)',
                }}
              />
            </div>

            {/* Counter */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
                <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />
                {status === 'pending' ? 'Iniciando…' : 'Scrapeando reels…'}
              </span>
              <span className="tabular-nums text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                {actualCount} / {requestedCount}
              </span>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col gap-4 pt-1">
            <p
              className="text-sm rounded-xl p-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
                color: 'var(--destructive)',
                border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)',
              }}
            >
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="self-end text-sm px-4 py-2 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            >
              Cerrar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
