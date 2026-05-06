'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex-1 flex items-center justify-center min-h-screen p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <AlertCircle size={32} style={{ color: 'var(--destructive, #dc2626)' }} />
        <div>
          <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            Algo falló en Competidores
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {error.message || 'Error desconocido'}
          </p>
        </div>
        <Button onClick={reset} variant="outline">Reintentar</Button>
      </div>
    </main>
  )
}
