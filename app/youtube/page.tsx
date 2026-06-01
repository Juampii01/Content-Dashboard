import type { Metadata } from 'next'
import { Suspense } from 'react'
import { YTProPage } from './YTProPage'

export const metadata: Metadata = {
  title: 'YouTube | Content Dashboard',
  description: 'Analytics y gestión de tu canal de YouTube.',
}

export default function YouTubePage() {
  return (
    <Suspense>
      <YTProPage />
    </Suspense>
  )
}
