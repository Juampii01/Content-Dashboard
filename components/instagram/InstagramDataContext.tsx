'use client'

import { createContext, useContext } from 'react'
import type { InstagramAccountSummary, UserReelRow } from '@/hooks/useInstagramData'

export interface InstagramDataContextValue {
  connected: boolean
  hasRealData: boolean
  summary: InstagramAccountSummary | null
  reels: UserReelRow[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
}

const InstagramDataContext = createContext<InstagramDataContextValue>({
  connected: false,
  hasRealData: false,
  summary: null,
  reels: [],
  loading: true,
  hasMore: false,
  loadingMore: false,
  loadMore: () => {},
})

export const InstagramDataProvider = InstagramDataContext.Provider

export function useInstagramDataContext(): InstagramDataContextValue {
  return useContext(InstagramDataContext)
}
