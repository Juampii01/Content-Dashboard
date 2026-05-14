'use client'

import { createContext, useContext } from 'react'
import type { InstagramAccountSummary, UserReelRow, StoryRow } from '@/hooks/useInstagramData'

export interface InstagramDataContextValue {
  connected: boolean
  hasRealData: boolean
  summary: InstagramAccountSummary | null
  reels: UserReelRow[]
  stories: StoryRow[]
  loading: boolean
}

const InstagramDataContext = createContext<InstagramDataContextValue>({
  connected: false,
  hasRealData: false,
  summary: null,
  reels: [],
  stories: [],
  loading: true,
})

export const InstagramDataProvider = InstagramDataContext.Provider

export function useInstagramDataContext(): InstagramDataContextValue {
  return useContext(InstagramDataContext)
}
