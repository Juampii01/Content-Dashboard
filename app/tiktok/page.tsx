import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TTProPage } from './TTProPage'

export const metadata: Metadata = {
  title: 'TikTok | Content Dashboard',
  description: 'Analytics y gestión de tu cuenta de TikTok.',
}

export default function TikTokPage() {
  return (
    <Suspense>
      <TTProPage />
    </Suspense>
  )
}
