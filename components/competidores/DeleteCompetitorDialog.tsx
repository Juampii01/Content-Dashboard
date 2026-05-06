'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
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

interface DeleteCompetitorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  competitorId: string
  username: string
  reelsCount: number
}

export function DeleteCompetitorDialog({
  open,
  onOpenChange,
  competitorId,
  username,
  reelsCount,
}: DeleteCompetitorDialogProps) {
  const router = useRouter()
  const [confirmInput, setConfirmInput] = useState('')
  const [loading, setLoading] = useState(false)

  const isConfirmed = confirmInput === username

  async function handleDelete() {
    if (!isConfirmed) return
    setLoading(true)
    try {
      const res = await fetch(`/api/competitors/${competitorId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })

      if (!res.ok && res.status !== 204) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? `Error ${res.status}`)
      }

      toast.success(`@${username} eliminado`)
      onOpenChange(false)
      router.push('/competidores')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar competidor')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!loading) {
      if (!next) setConfirmInput('')
      onOpenChange(next)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar competidor</DialogTitle>
          <DialogDescription>
            Esta acción es irreversible.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          {/* Warning */}
          <div
            className="rounded-xl p-3 text-sm"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
              color: 'var(--destructive)',
              border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)',
            }}
          >
            Se perderán {reelsCount} reels y todos sus análisis, transcripciones y chats.
          </div>

          {/* Confirmation input */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
              Escribe <strong style={{ color: 'var(--foreground)' }}>{username}</strong> para confirmar
            </p>
            <input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={username}
              autoFocus
              className="w-full bg-transparent text-sm outline-none px-3 py-2.5 rounded-xl"
              style={{
                color: 'var(--foreground)',
                border: `1px solid ${isConfirmed ? 'var(--destructive)' : 'var(--border)'}`,
                backgroundColor: 'var(--muted)',
              }}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!isConfirmed || loading}
            onClick={handleDelete}
          >
            {loading ? (
              <><Loader2 size={13} className="animate-spin" /> Eliminando…</>
            ) : (
              <><Trash2 size={13} /> Borrar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
