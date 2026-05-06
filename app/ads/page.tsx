import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdsContent } from './AdsContent'
import Loading from './loading'

export const metadata: Metadata = {
  title: 'Ads Dashboard | Eternity Dashboard',
  description: 'Rendimiento centralizado de Meta Ads y TikTok Ads',
}

export default function AdsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdsContent />
    </Suspense>
  )
}
