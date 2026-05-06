import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Instagram | Eternity Dashboard',
  description: 'Estadísticas detalladas de tu cuenta de Instagram',
}
import { InstagramContent } from './InstagramContent'

export default function InstagramPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground text-sm">Cargando...</div>}>
      <InstagramContent />
    </Suspense>
  )
}
