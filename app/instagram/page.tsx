import type { Metadata } from 'next'
import { Suspense } from 'react'
import { IGProPage } from './IGProPage'

export const metadata: Metadata = {
  title: 'Instagram | Content Dashboard',
  description: 'Analytics, contenido y gestión de Instagram desde un solo lugar.',
}

export default function InstagramPage() {
  return (
    <Suspense>
      <IGProPage />
    </Suspense>
  )
}
