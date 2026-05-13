'use client'

import { createContext, useContext } from 'react'
import type {
  InstagramAccountSummary,
  UserReelRow,
  UserStoryRow,
} from '@/hooks/useInstagramData'

export interface InstagramDataContextValue {
  connected: boolean
  hasRealData: boolean
  summary: InstagramAccountSummary | null
  reels: UserReelRow[]
  stories: UserStoryRow[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
  syncStories: () => void
  syncingStories: boolean
}

const InstagramDataContext = createContext<InstagramDataContextValue>({
  connected: false,
  hasRealData: false,
  summary: null,
  reels: [],
  stories: [],
  loading: true,
  hasMore: false,
  loadingMore: false,
  loadMore: () => {},
  syncStories: () => {},
  syncingStories: false,
})

export const InstagramDataProvider = InstagramDataContext.Provider

export function useInstagramDataContext(): InstagramDataContextValue {
  return useContext(InstagramDataContext)
}
