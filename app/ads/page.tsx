import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdsProPage } from './AdsProPage'

export const metadata: Metadata = {
  title: 'Ads | Content Dashboard',
  description: 'Gestión y analytics de campañas de Meta Ads.',
}

export default function AdsPage() {
  return (
    <Suspense>
      <AdsProPage />
    </Suspense>
  )
}
