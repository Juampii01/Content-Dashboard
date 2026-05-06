# Competidores — Contract Brief for Parallel Agents (Ola 2)

**Audience**: 5 agents working in parallel (A1, A2, A3 = backend APIs; B, C = UI).
**Goal**: Build a "Baúl de Competidores" feature where the user scrapes Instagram reels by competitor, persists them, transcribes with Groq Whisper, analyzes with Claude, and chats about each reel.

**Status**: Ola 1 is DONE. This doc is your entry point. Read it end-to-end before writing code.

---

## 1. Project context (must-know)

- **Stack**: Next.js **16.2.3** (App Router, React 19), TypeScript, Tailwind v4, `@base-ui/react` (NOT shadcn — headless primitives wrapped in `components/ui/`), lucide-react, motion/react, Zod, Prisma 6 + SQLite.
- **Working dir**: `/Users/cristianortiz/CONTENT DASHBOARD 2.O/content-dashboard/`
- **Dev server**: `npm run dev` (already usually running via preview tooling).
- **CLAUDE.md** at project root warns: *"This is NOT the Next.js you know — read `node_modules/next/dist/docs/` before coding."*

### Next.js 16 gotchas you WILL hit

1. `params` in dynamic route handlers is a **Promise**. Always:
   ```ts
   export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
     const { id } = await params
     // ...
   }
   ```
2. `fetch()` in Route Handlers is **not cached by default**. Don't add `cache: 'no-store'` redundantly.
3. For background work that must outlive the response, use **`after()`** from `next/server` (stable since 15.1):
   ```ts
   import { after } from 'next/server'
   export async function POST(req: NextRequest) {
     // ...start fast work, return response...
     after(async () => { /* slow work continues here */ })
     return NextResponse.json({ jobId })
   }
   ```
4. If your handler runs beyond Vercel's default timeout, export `maxDuration`:
   ```ts
   export const maxDuration = 300 // seconds — only honored in Pro/Enterprise
   ```

### Existing patterns to match (DO NOT invent new ones)

- **API routes**: see `app/api/analizador/scrape/route.ts` — uses `NextRequest`/`NextResponse`, `checkRateLimit()` from `@/lib/utils/ratelimit`, Zod `.safeParse()`, returns `{ error }` with status codes.
- **Rate limit helper**: `lib/utils/ratelimit.ts` (gracefully no-ops if KV env vars absent — fine for local dev).
- **Anthropic client**: instantiate inline (`new Anthropic()`), model `claude-sonnet-4-6`, simple `messages.create()`. See `app/api/analizador/analyze/route.ts`.
- **Tailwind**: use CSS vars — `var(--background)`, `var(--card)`, `var(--border)`, `var(--foreground)`, `var(--muted)`, `var(--muted-foreground)`, `var(--accent)`, `var(--accent-foreground)`. No hardcoded colors.

---

## 2. Feature UX recap

User flow:
1. `/competidores` → list of competitors + "Añadir competidor" button.
2. Add: input `@username` + select 30/60/90 reels → job starts → progress dialog with ETA → redirect to `/competidores/[username]`.
3. Competitor page: avatar + username + followers + grid of reels. Sort by views/likes/comments/postedAt (default: `postedAt desc`). Toolbar: Refresh (new reels only), Delete (strict confirmation — user must type the username).
4. Click reel → **drawer lateral** (built on base-ui Dialog) with 4 tabs:
   - **Reel**: thumbnail + caption + metrics + "Ver en Instagram" button (no inline video preview).
   - **Transcripción**: button "Transcribir" (hits Groq). Shows transcript + language. Footer button "Extraer información" jumps to Análisis tab.
   - **Análisis**: model selector (Haiku/Sonnet/Opus) + "Extraer información". Shows pain points, desires, problems, insights, keywords as chips. History of previous analyses clickable.
   - **Chat**: streaming chat grounded in the reel's caption + transcription + latest analysis. Model selector. Messages persisted.

See the user's reference screenshot style: compact card with thumbnail 9:16, stats row (eye/heart/comments icons), "Ver en Instagram" pill.

---

## 3. Shared modules (already written in Ola 1 — IMPORT, don't duplicate)

| Path | Purpose |
|---|---|
| `lib/db.ts` | Prisma singleton. `import { db } from '@/lib/db'` |
| `lib/types/competidores.ts` | **All DTOs, Request/Response types, sort types**. Single source of truth. |
| `lib/schemas/competidores/index.ts` | Zod schemas for API inputs (`CreateCompetitorSchema`, `AnalyzeSchema`, `ChatSchema`, `usernameSchema`). |
| `lib/claude/models.ts` | `CLAUDE_MODELS`, `ClaudeModelId`, `DEFAULT_MODEL`, `getModelMeta`, `estimateClaudeCost`. |
| `lib/mocks/competidores.ts` | `MOCK_COMPETITORS`, `MOCK_REELS`, `MOCK_TRANSCRIPTION`, `MOCK_ANALYSIS`, `MOCK_CHAT_MESSAGES`, `MOCK_RUNNING_JOB`. **UI agents use these**. |
| `prisma/schema.prisma` | DB schema. Models: `Competitor`, `Reel`, `Transcription`, `Analysis`, `ChatMessage`, `ScrapeJob`. |
| `components/layout/Sidebar.tsx` | Already has "Competidores" entry. Do not re-edit. |
| `app/competidores/page.tsx` | Scaffold exists, imports `CompetitorList`. Agent B owns the component. |
| `app/competidores/[username]/page.tsx` | Scaffold exists, imports `CompetitorDetail`. Agent B owns the component. |

### Existing reusable pieces (READ, reuse, don't duplicate)

- `components/reels/ReelCard.tsx` — reference for reel card look (thumbnail 9:16, stats row, Ver-en-IG pill). **Not directly reusable** because it's tied to Instagram analytics domain; create your own ReelCard but copy the visual pattern.
- `components/shared/MetricBadge.tsx` — badge component for multiplier/ad flags.
- `lib/utils/formatters.ts` — has `formatK()` for numbers.
- `lib/utils/ratelimit.ts` — `checkRateLimit()`.
- `components/ui/` — Dialog, Tabs, Button, Badge, Card, Tooltip, ScrollArea, Separator. **No Drawer, no Select, no Input** — build on top of Dialog if needed.

---

## 4. API contracts (authoritative)

Full shapes live in `lib/types/competidores.ts`. Summary:

| Method | Path | Request | Response | Owner |
|---|---|---|---|---|
| POST | `/api/competitors` | `CreateCompetitorRequest` | `CreateCompetitorResponse` | A1 |
| GET | `/api/competitors` | — | `ListCompetitorsResponse` | A1 |
| GET | `/api/competitors/[id]` | — | `GetCompetitorResponse` | A1 |
| DELETE | `/api/competitors/[id]` | — | 204 | A1 |
| POST | `/api/competitors/[id]/refresh` | — | `RefreshCompetitorResponse` | A1 |
| GET | `/api/jobs/[id]` | — | `GetJobResponse` | A1 |
| GET | `/api/reels/[id]` | — | `GetReelResponse` | A2 |
| POST | `/api/reels/[id]/transcribe` | — | `TranscribeResponse` | A2 |
| POST | `/api/reels/[id]/analyze` | `AnalyzeRequest` | `AnalyzeResponse` | A2 |
| GET | `/api/reels/[id]/chat` | — | `GetChatResponse` | A3 |
| POST | `/api/reels/[id]/chat` | `ChatRequest` | streaming `text/plain` | A3 |

**Rules**:
- All errors: `{ error: string, issues?: flattenedZodErrors }` with proper HTTP code.
- All DTOs use **ISO string** dates (never `Date` over the wire).
- Lookup by `id` param is CUID except `/competidores/[username]` page route which is username — resolve to id inside handler.
- Actor correct name: **`apify~instagram-reel-scraper`** (with `~`, not `/`).
- Apify env var: `APIFY_API_TOKEN`. Groq: `GROQ_API_KEY`. Anthropic: `ANTHROPIC_API_KEY`. DB: `DATABASE_URL` (`file:./dev.db`). All in `.env.local`.

---

## 5. Agent whitelists (strict ownership)

**Do NOT touch files outside your list.** If something you need is missing, leave a `TODO(OLA3):` comment in your code so the integration wave resolves it.

### Agent A1 — Scrape + Jobs API
Create:
- `app/api/competitors/route.ts` (POST, GET)
- `app/api/competitors/[id]/route.ts` (GET, DELETE)
- `app/api/competitors/[id]/refresh/route.ts` (POST)
- `app/api/jobs/[id]/route.ts` (GET)
- `lib/apify/instagram-reel-scraper.ts` (wrapper: startRun, pollStatus, fetchItems, mapToReelInput)

Use `after()` for the background scrape; the POST returns quickly with a `jobId`. The wrapper updates the `ScrapeJob` row as Apify progresses.

### Agent A2 — Transcribe + Analyze API
Create:
- `app/api/reels/[id]/route.ts` (GET)
- `app/api/reels/[id]/transcribe/route.ts` (POST)
- `app/api/reels/[id]/analyze/route.ts` (POST)
- `lib/groq/transcribe.ts` (pass Apify videoUrl via `url` param — Groq fetches remotely; no local download)
- `lib/claude/analyze-reel.ts` (uses `tool_use` for strict JSON; prompt in Spanish; extracts painPoints/desires/problems/insights/keywords)

Transcription: call Groq with `file: videoUrl` via the `url` field (supported by Groq, avoids 25MB upload cap). Auto-detect language. Persist `Transcription` row. If Apify videoUrl returns 4xx (expired), respond 410 with `{ error: 'VIDEO_URL_EXPIRED' }` so UI can offer re-fetch.

Analysis: if a previous `Analysis` exists for the same (reelId, model), insert a new row anyway (history preserved). Use `tool_use` forced (tool_choice: { type: 'tool', name: 'extract_insights' }).

### Agent A3 — Chat API
Create:
- `app/api/reels/[id]/chat/route.ts` (GET = history, POST = streaming response)
- `lib/claude/chat-reel.ts` (builds messages with reel context + history, streams, persists both user+assistant on completion)

Stream shape: `text/plain; charset=utf-8` chunked text. Do not invent SSE framing — just raw text deltas. On stream close, the assistant message is persisted in DB (client refetches GET to sync).

### Agent B — UI list + grid + add/delete
Create:
- `components/competidores/CompetitorList.tsx` (**replace placeholder** — real list + "Añadir" button)
- `components/competidores/CompetitorCard.tsx`
- `components/competidores/AddCompetitorDialog.tsx` (uses base-ui Dialog; shows cost estimate)
- `components/competidores/ScrapeProgressDialog.tsx` (polls `GET /api/jobs/[id]` every 2s)
- `components/competidores/CompetitorDetail.tsx` (**replace placeholder** — avatar + reel grid + toolbar)
- `components/competidores/ReelGrid.tsx`
- `components/competidores/ReelCard.tsx` (look like user's screenshot: thumbnail, metrics row, "Ver en Instagram" pill; **click fires `onOpenDrawer(reel)` prop — does NOT open the drawer itself**)
- `components/competidores/SortControls.tsx` (uses `DEFAULT_SORT` from types)
- `components/competidores/DeleteCompetitorDialog.tsx` (strict: input field where user types username to unlock delete button)

**During development, import mocks**. Replace with real `fetch()` to the API in Ola 3 (the integration wave).

### Agent C — UI drawer + tabs + chat
Create:
- `components/competidores/ReelDetailDrawer.tsx` (wraps base-ui Dialog positioned right, full height, ~520px wide; props: `reelId | null`, `onClose`; fetches reel data via prop or internal query hook)
- `components/competidores/ReelTab.tsx` (tab 1 content: thumbnail, caption, metrics, "Ver en Instagram" button)
- `components/competidores/TranscribeSection.tsx` (tab 2; calls `/api/reels/[id]/transcribe`)
- `components/competidores/AnalysisSection.tsx` (tab 3; ModelSelector + chips for each category + history)
- `components/competidores/ChatSection.tsx` (tab 4; ReadableStream consumption + persistence)
- `components/competidores/ModelSelector.tsx` (segmented control: Haiku / Sonnet / Opus, shows tagline + estimated price)
- `components/competidores/CostBadge.tsx` (small inline "~$0.0003" badge)

**During development, import mocks**. Fetching is stubbed to return `MOCK_TRANSCRIPTION`, `MOCK_ANALYSIS`, `MOCK_CHAT_MESSAGES`.

---

## 6. Non-negotiables

- **Never edit** files outside your whitelist. If you find a bug in shared code, leave a `TODO(OLA3):` comment and report back.
- **Never add** new npm dependencies. Everything you need is already installed.
- **Never rename** files listed as owned.
- **Next.js 16**: `params` is Promise, `fetch()` not cached by default, `after()` for background.
- **Imports**: use `@/` alias paths. No deep relative imports.
- **Styles**: CSS vars only. No hardcoded hex colors. Rounded corners (`rounded-xl`/`rounded-2xl`), 1px borders on `var(--border)`.
- **Accessibility**: buttons get `aria-label` when icon-only. Dialogs get `aria-modal`/`role="dialog"` (base-ui handles it).
- **Zero `any`**. Zero `@ts-ignore`. Use the types from `lib/types/competidores.ts` strictly.

---

## 7. Prompt for `analyze-reel.ts` (A2 reference — adjust wording only)

```
Eres un analista de contenido digital experto en marketing de nicho en español.
Analiza este reel de Instagram y extrae insights accionables para un creador
que quiere competir en el mismo espacio.

- DOLORES: frustraciones/pains que la audiencia vive (lo que el lector siente)
- DESEOS: aspiraciones, resultados soñados
- PROBLEMAS: obstáculos concretos mencionados
- INSIGHTS: ángulos no-obvios, hooks narrativos, por qué funciona este reel
- KEYWORDS: términos del nicho, hashtags conceptuales, vocabulario usado

Sé específico y accionable. Evita generalidades. 3-6 items por categoría.

[contexto: caption, transcripción, métricas]
```

Use `tool_use` with tool `extract_insights` having strict `input_schema` matching `AnalysisDTO` (arrays of strings).

---

## 8. Known open issues (Ola 3 will resolve)

- `videoUrl` and `thumbnailUrl` expire (~hours). Graceful degradation only; re-fetch button added in Ola 3.
- Rate limits on Apify/Groq/Claude: not a concern locally, deferred.
- Cost display polish in UI (Agent B / C hook up `estimateClaudeCost`, but exact copy is Ola 3).

---

**Questions during execution**: leave a `TODO(OLA3):` with the question in code and continue. Don't block.

Good luck. Let's make this fast.
