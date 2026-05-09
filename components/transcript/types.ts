/**
 * Shared types for the Transcript feature.
 *
 * `HistoryItem` represents a row in `GET /api/transcript`. Some fields are
 * nullable (older rows from before the schema stabilized).
 *
 * `CurrentResult` represents the freshly returned `POST /api/transcript`
 * payload — text fields are always present here.
 */
import type { Platform } from '@/components/ui/PlatformBadge'

export interface HistoryItem {
  id: string
  url: string
  platform: Platform
  title: string | null
  creator: string | null
  duration: string | null
  thumbnail: string | null
  transcript: string | null
  summary: string | null
  createdAt: string
}

export interface CurrentResult {
  id?: string
  url: string
  platform: Platform
  title: string | null
  creator: string | null
  duration: string | null
  thumbnail: string | null
  transcript: string
  summary: string
}
