/**
 * Groq Whisper transcription wrapper.
 *
 * Strategy: pass the video URL directly to Groq via the `url` field in a
 * multipart/form-data request to the OpenAI-compatible endpoint.  This avoids
 * any local download and stays within Groq's 25 MB upload cap.
 *
 * Groq docs: https://console.groq.com/docs/speech-to-text
 * Model used: whisper-large-v3-turbo (cost: $0.04 / audio-hour).
 *
 * If Groq returns a non-2xx status the function throws an Error whose message
 * contains the HTTP status code so the caller can map 4xx → 410.
 */

const GROQ_TRANSCRIPTION_ENDPOINT =
  'https://api.groq.com/openai/v1/audio/transcriptions'

const GROQ_MODEL = 'whisper-large-v3-turbo'
const COST_PER_AUDIO_HOUR_USD = 0.04

export interface TranscriptionResult {
  text: string
  language: string
  costUsd: number
  durationSec?: number
  raw: unknown
}

/**
 * Transcribe a remote video/audio URL using Groq Whisper.
 *
 * The `url` field in the multipart body tells Groq to fetch the media
 * remotely — no local download is performed.
 *
 * Precise call:
 *   POST https://api.groq.com/openai/v1/audio/transcriptions
 *   Authorization: Bearer $GROQ_API_KEY
 *   Content-Type: multipart/form-data
 *   Fields:
 *     model=whisper-large-v3-turbo
 *     response_format=verbose_json          ← gives us language + duration
 *     url=<videoUrl>                        ← Groq fetches remotely
 *
 * @throws {Error} with message containing HTTP status code on Groq failure.
 */
export async function transcribeFromUrl(videoUrl: string): Promise<TranscriptionResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  // Build multipart form — pass the URL directly via the `url` field so Groq
  // fetches the file remotely (no local download, avoids the 25MB cap).
  // TODO(OLA3): If Groq changes the param name, update here.  At time of
  // writing the OpenAI-compatible endpoint accepts `url` in addition to `file`.
  const form = new FormData()
  form.append('model', GROQ_MODEL)
  form.append('response_format', 'verbose_json')
  form.append('url', videoUrl)

  const response = await fetch(GROQ_TRANSCRIPTION_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // Do NOT set Content-Type — the browser/Node runtime sets it with the
      // correct boundary when using FormData.
    },
    body: form,
  })

  if (!response.ok) {
    // Include the HTTP status so the route handler can detect 4xx (expired URL)
    // and return a 410 to the UI.
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Groq transcription failed with HTTP ${response.status}: ${errorText}`
    )
  }

  // verbose_json shape:
  // { text, language, duration, segments: [...], task, ... }
  const data = await response.json() as {
    text?: string
    language?: string
    duration?: number
    [key: string]: unknown
  }

  const text = data.text ?? ''
  const language = data.language ?? 'unknown'
  const durationSec = typeof data.duration === 'number' ? data.duration : undefined

  // Cost formula: $0.04 / audio-hour
  const costUsd = durationSec != null
    ? (durationSec / 3600) * COST_PER_AUDIO_HOUR_USD
    : 0

  return {
    text,
    language,
    costUsd,
    durationSec,
    raw: data,
  }
}
