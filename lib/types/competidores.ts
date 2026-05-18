/**
 * Competidores — contratos de API + DTOs.
 *
 * Modelos Prisma (dates como Date) viven en `@prisma/client`.
 * Este módulo define los DTOs que viajan por HTTP (dates como string ISO)
 * y los tipos request/response de cada endpoint.
 *
 * Regla: todos los endpoints devuelven DTOs (no modelos Prisma crudos).
 * Los agentes de Ola 2 importan exclusivamente desde este módulo.
 */

import type { ClaudeModelId } from '@/lib/claude/models'

// ─── DTOs (wire shape) ─────────────────────────────────────────────────────

export interface CompetitorDTO {
  id: string
  username: string                                    // sin "@"
  displayName: string | null
  profilePicUrl: string | null
  followersCount: number | null
  lastScrapedAt: string | null                        // ISO
  createdAt: string                                   // ISO
  reelsCount?: number                                 // en list view
}

export interface ReelDTO {
  id: string
  competitorId: string
  instagramId: string
  shortcode: string
  url: string                                         // https://instagram.com/reel/XXX
  thumbnailUrl: string | null
  videoUrl: string | null
  caption: string | null
  viewsCount: number
  likesCount: number
  commentsCount: number
  sharesCount: number
  durationSec: number | null
  postedAt: string | null                             // ISO
  scrapedAt: string                                   // ISO
  hasTranscription: boolean                           // resumen para grid
  analysesCount: number                               // resumen para grid
}

export interface TranscriptionDTO {
  id: string
  reelId: string
  text: string
  language: string                                    // "es", "en", etc.
  provider: string                                    // "groq-whisper-v3-turbo"
  costUsd: number | null
  createdAt: string
}

export interface AnalysisDTO {
  id: string
  reelId: string
  model: ClaudeModelId
  painPoints: string[]
  desires: string[]
  problems: string[]
  insights: string[]
  keywords: string[]
  inputTokens: number | null
  outputTokens: number | null
  costUsd: number | null
  createdAt: string
}

export interface ChatMessageDTO {
  id: string
  reelId: string
  role: 'user' | 'assistant'
  content: string
  model: ClaudeModelId | null
  createdAt: string
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'
export type JobKind = 'initial' | 'refresh'

export interface ScrapeJobDTO {
  id: string
  competitorId: string | null
  username: string
  requestedCount: number
  actualCount: number
  status: JobStatus
  kind: JobKind
  errorMessage: string | null
  costUsd: number | null
  startedAt: string
  completedAt: string | null
}

// ─── Requests / Responses ──────────────────────────────────────────────────

// POST /api/competitors — crea o devuelve existente y dispara scrape
export interface CreateCompetitorRequest {
  username: string                                    // con o sin "@"
  limit: 10 | 20 | 30
}
export interface CreateCompetitorResponse {
  competitor: CompetitorDTO
  jobId: string
}

// GET /api/competitors
export interface ListCompetitorsResponse {
  competitors: CompetitorDTO[]
}

// GET /api/competitors/[id]
export interface GetCompetitorResponse {
  competitor: CompetitorDTO
  reels: ReelDTO[]
}

// DELETE /api/competitors/[id] → 204 no body

// POST /api/competitors/[id]/refresh — trae sólo reels nuevos
export interface RefreshCompetitorResponse {
  jobId: string
}

// GET /api/jobs/[id]
export interface GetJobResponse {
  job: ScrapeJobDTO
  progressPct: number                                 // 0-100 aproximado
}

// GET /api/reels/[id]
export interface GetReelResponse {
  reel: ReelDTO
  transcription: TranscriptionDTO | null
  analyses: AnalysisDTO[]
}

// POST /api/reels/[id]/transcribe
export interface TranscribeResponse {
  transcription: TranscriptionDTO
}

// POST /api/reels/[id]/analyze
export interface AnalyzeRequest {
  model: ClaudeModelId
}
export interface AnalyzeResponse {
  analysis: AnalysisDTO
}

// GET /api/reels/[id]/chat
export interface GetChatResponse {
  messages: ChatMessageDTO[]
}

// POST /api/reels/[id]/chat (streaming)
// Request body:
export interface ChatRequest {
  content: string
  model: ClaudeModelId
}
// Response: streaming text/plain of assistant delta.
// After stream ends, client should refetch GetChatResponse to get final persisted messages.

// ─── Error shape (todos los endpoints) ─────────────────────────────────────
export interface ApiError {
  error: string
  issues?: Record<string, string[]>                   // zod flatten (dev only)
}

// ─── Sort options (UI → API) ──────────────────────────────────────────────
export type ReelSortField = 'views' | 'likes' | 'comments' | 'postedAt'
export type ReelSortDir = 'asc' | 'desc'
export const DEFAULT_SORT: { field: ReelSortField; dir: ReelSortDir } = {
  field: 'postedAt',
  dir: 'desc',
}
