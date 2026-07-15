# Active Routes

> **Before marking any visual task "done", navigate each route below and verify
> the change renders correctly. Missing a route is the most common reason a UI
> task ships incomplete.**

| Route          | Component file                                  | Purpose                                                          |
| -------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `/`            | `app/page.tsx` → `components/home/HomeContent`  | Home / overview dashboard                                        |
| `/ads`         | `app/ads/page.tsx` → `AdsProPage`               | Ads dashboard — Meta Ads: 3 tabs (Resumen, Campañas, Rendimiento) + ConnectButton + sync |
| `/ai`          | `app/ai/page.tsx` → `EternityAIContent`         | Eternity AI — streaming chat grounded on workspace data          |
| `/analizador`  | `app/analizador/page.tsx` → `AnalizadorContent` | Content analyzer (uses `app/api/analizador`)                     |
| `/bases`       | `app/bases/page.tsx` → `BasesContent`           | Knowledge bases / source library                                 |
| `/investigacion` | `app/investigacion/page.tsx` → `InvestigacionHub` | Unified research hub — Competidores / Investigar Canal / Transcript with YouTube & Instagram platform subtabs |
| `/competidores` | `app/competidores/page.tsx`                    | **Redirects → `/investigacion`** (kept for backward compat)      |
| `/competidores/[username]` | `app/competidores/[username]/page.tsx` | Competitor detail — reels, transcribe, analysis, chat            |
| `/contenido`   | `app/contenido/page.tsx` → `ContenidoContent`   | Content workspace (editor + lists)                               |
| `/instagram`   | `app/instagram/page.tsx` → `IGProPage`          | Instagram — 4 tabs (Inicio, Contenido, Audiencia, Publicar). Publicar soporta Imagen/Reel/Carrusel; Stories es stub deshabilitado ("próximamente") |
| `/login`       | `app/login/page.tsx`                            | Supabase Auth — email/password. Redirects to `/` on success      |
| `/tareas`      | `app/tareas/page.tsx` → `KanbanBoard`           | Task kanban board                                                |
| `/transcript`  | `app/transcript/page.tsx`                       | **Redirects → `/investigacion`** (kept for backward compat)      |
| `/content-research` | `app/content-research/page.tsx`            | **Redirects → `/investigacion`** (kept for backward compat)      |
| `/video-feed`  | `app/video-feed/page.tsx` → `VideoFeedView`     | Connect own Instagram → last 30 days ranked by engagement, AI analysis per post. Singleton per (client, platform). |
| `/tiktok`      | `app/tiktok/page.tsx` → `TTProPage`             | TikTok — 3 tabs (Inicio, Videos, Publicar). Publicar es stub ("próximamente") + ConnectButton + sync |
| `/youtube`     | `app/youtube/page.tsx` → `YTProPage`            | YouTube — 3 tabs (Inicio, Videos, Audiencia). Audiencia es stub ("demografía próximamente" pendiente de scopes de API) + ConnectButton |
| `/pending-approval` | `app/pending-approval/page.tsx`            | Landing for PENDING users — shown until a SUPER_ADMIN approves them |
| `/admin`       | `app/admin/page.tsx`                            | Admin overview — counters (usuarios, admins, pendientes). SUPER_ADMIN only |
| `/admin/users` | `app/admin/users/page.tsx` → `UsersAdminClient` | User management — approve, role changes. SUPER_ADMIN only |

API routes live under `app/api/` (`analizador`, `copy`, `social/[platform]`, `youtube/*`, `admin/*`, `me/*`) and are not user-facing.

### Ads APIs

- `POST /api/ads/sync` — pull Meta Ads accounts + campaigns with 30d insights, upsert `AdAccount` + `AdCampaign`. Rate-limited 5/min.
- `GET  /api/ads/campaigns?platform=meta&limit=&cursor=` — paginated campaign list ordered by spend desc
- `GET  /api/ads/account-summary` — connection state + aggregated stats + campaigns count

### TikTok APIs

- `POST /api/tiktok/sync` — pull account stats + last 60 videos (3 pages × 20), upsert `AccountSnapshot` (platform='tiktok') + `TikTokVideo`. Rate-limited 5/min. Handles token refresh automatically.
- `GET  /api/tiktok/videos?limit=&cursor=` — paginated list of stored TikTok videos for the active client
- `GET  /api/tiktok/account-summary` — connection state + token-expired flag + latest snapshot + videos count

### YouTube APIs

- `POST /api/youtube/sync` — pull channel stats + last 25 uploads, upsert `AccountSnapshot` + `YouTubeVideo`
- `GET  /api/youtube/videos?limit=&cursor=` — paginated list of stored videos for the active client
- `GET  /api/youtube/channel-summary` — connection state + latest snapshot + videos count

### Eternity AI APIs

- `POST /api/ai/chat` — streams Claude response for `{ conversationId?, content, model, context? }`. Creates a Conversation on first call. Persists user + assistant `AIMessage` with token/cost. Returns `x-conversation-id` header
- `GET /api/ai/conversations` — list conversations for the active client (most recent first, max 100)
- `POST /api/ai/conversations` — create an empty conversation (title optional)
- `GET /api/ai/conversations/[id]` — return conversation + messages (tenant-scoped)
- `DELETE /api/ai/conversations/[id]` — delete conversation + its messages (tenant-scoped)

### Transcript APIs

- `POST /api/transcript` — body `{ url }` (YouTube or Instagram). Resolves video, transcribes (Apify + Groq Whisper for IG, Apify + watch-page scrape for YT), summarizes via Claude, persists to `TranscriptHistory`. Rate-limited 5/min.
- `GET /api/transcript` — list the active client's last 50 transcripts (most recent first)
- `DELETE /api/transcript` — body `{ id }` removes one row (must belong to active client)

### Content Research + Video Feed APIs

- `POST /api/content-research` — body `{ channelUrl, timeframeDays? }`. Resolves a YouTube channel (via Data API) or Instagram profile (Apify), returns top 5 videos in window with batched Claude Haiku analysis. Saves to `ContentResearchHistory`. Rate-limited 5/min.
- `GET /api/content-research` — list the active client's last 50 research runs.
- `DELETE /api/content-research` — body `{ id }` removes one row.
- `GET /api/video-feed` — return the active client's connected Instagram feed (or `{ account: null }`).
- `POST /api/video-feed` — body `{ channelUrl }`. Connect or refresh: scrapes profile, only re-analyzes new posts, merges with existing analyses, persists. Rate-limited 5/min.
- `DELETE /api/video-feed` — disconnect (removes the row).

### Admin + auth APIs

- `GET /api/me` — current user's profile summary (id, email, role, activeClientId)
- `GET /api/me/clients` — clients the current user can switch to
- `POST /api/me/active-client` — set the `activeClientId` cookie (validates access)
- `GET /api/me/global-stats` — TopBar metrics: aggregated `{ followers, views, engagementRate }` from latest `AccountSnapshot` per platform. Returns `null` when no data exists for the active client.
- `GET /api/admin/users` — list all users with their client access (SUPER_ADMIN)
- `PATCH /api/admin/users/[id]` — update globalRole / displayName (SUPER_ADMIN)
- `POST /api/admin/users/[id]/client-access` — grant access (SUPER_ADMIN)
- `DELETE /api/admin/users/[id]/client-access/[clientId]` — revoke access (SUPER_ADMIN)
- `GET /api/admin/clients` — list all clients with access counts (SUPER_ADMIN)
- `POST /api/admin/clients` — create client (SUPER_ADMIN)
- `PATCH /api/admin/clients/[id]` — update name/slug (SUPER_ADMIN)
- `DELETE /api/admin/clients/[id]` — hard delete client + cascaded data (SUPER_ADMIN)

---

## Pre-merge visual checklist (copy into your task)

```
Visual verification — all routes
- [ ] /            home renders, no console errors
- [ ] /ads         loads, tabs (Resumen, Campañas, Rendimiento) renderizan; ConnectButton Meta Ads visible; sync funciona tras conectar
- [ ] /ai          Eternity chat renders; nueva conversación, streaming, historial funcionan
- [ ] /analizador  loads, brand accents correct
- [ ] /bases       loads, brand accents correct
- [ ] /investigacion  hub renders; main tabs (Competidores, Investigar Canal, Transcript) y platform subtabs (YouTube, Instagram) funcionan; Competidores/Instagram carga lista; Investigar Canal filtra por plataforma; Transcript filtra por plataforma
- [ ] /competidores  redirects to /investigacion
- [ ] /competidores/[username]  detail renders (reels, transcribe, analysis, chat)
- [ ] /contenido   loads, brand accents correct
- [ ] /instagram   loads, tabs (Inicio, Contenido, Audiencia, Publicar) renderizan; Publicar soporta Imagen/Reel/Carrusel (Stories deshabilitado); ConnectButton visible
- [ ] /login       form renders; successful login redirects to /
- [ ] /tareas      kanban renders, drag works
- [ ] /transcript  redirects to /investigacion
- [ ] /content-research  redirects to /investigacion
- [ ] /video-feed  empty state shows connect form; after connect, posts grid renders ranked with AI summaries
- [ ] /tiktok      loads, tabs (Inicio, Videos, Publicar) renderizan (Publicar es stub "próximamente"); ConnectButton visible; sync funciona tras conectar
- [ ] /youtube     loads, tabs (Inicio, Videos, Audiencia) renderizan (Audiencia es stub "demografía próximamente")
- [ ] /pending-approval  PENDING user lands here, sign-out works
- [ ] /admin       (SUPER_ADMIN) overview cards render; non-admin sees 404
- [ ] /admin/users (SUPER_ADMIN) table + filter + approve flow works
- [ ] Sidebar      TikTok + Ads aparecen correctamente; ClientSwitcher visible
- [ ] Sidebar      grupo ADMIN aparece solo para SUPER_ADMIN
- [ ] `npm run check:brand` passes
```

When this file changes (route added/removed/renamed), update the table **and**
the checklist in the same PR.
