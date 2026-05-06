# API Reference — Content Dashboard 2.O

Audiencia: developer o integrator que consume o extiende las rutas de `app/api/**`. Fuente de verdad: el código en `main`. Cuando agregues una ruta, actualiza esta tabla y `docs/ROUTES.md` en el mismo PR.

Convenciones usadas en la columna **Auth**:

- **Público** — sin sesión requerida.
- **`requireUserId`** — cualquier user autenticado.
- **`requireProfile`** — user con fila en `Profile`.
- **`requireActiveClient`** — user + `activeClientId` cookie + fila en `ClientAccess` (o SUPER_ADMIN).
- **`requireSuperAdmin`** — rol global `SUPER_ADMIN` (via `lib/admin/guard.ts`).

**Input** cita el schema Zod cuando existe; si el handler usa un schema inline anónimo, lo indico como `inline`. Ver `lib/schemas/**` para el detalle.

**Rate limit** se reporta como `N req / T` cuando el handler llama `checkRateLimit(ip, scope, N, 'T')`. `—` significa sin rate limit aplicado.

---

## Auth / Me

| Método + path | Auth | Input | Output | Rate limit | Notas |
|---|---|---|---|---|---|
| `POST /api/auth/notify-signup` | Público | `NotifySignupSchema` (`email`, `userId?`) | `{ ok: true }` | 3 / 1 h | Fire-and-forget desde `/login` post-signup. Resend email a `SUPER_ADMIN_EMAIL`. Swallow de errores de Resend |
| `GET /api/me` | `requireProfile` | — | `{ userId, email, displayName, avatarUrl, globalRole, activeClientId }` | — | — |
| `PATCH /api/me` | `requireProfile` | inline (`displayName?`, `avatarUrl?`) | `{ ok: true, profile }` | — | `avatarUrl` data URL, máx ~200 KB |
| `GET /api/me/clients` | `requireProfile` | — | `{ clients: [{id, name, slug}] }` | — | SUPER_ADMIN ve todos; MEMBER solo los suyos; PENDING ve `[]` |
| `POST /api/me/active-client` | `requireProfile` | `SetActiveClientSchema` (`clientId`) | `{ ok: true, clientId }` | — | Valida `ClientAccess` (o existencia si SUPER_ADMIN). Set cookie `activeClientId` |

---

## Admin (SUPER_ADMIN only)

Todas las rutas de abajo pasan por `adminAuthOr401()` → `requireSuperAdmin`.

| Método + path | Auth | Input | Output | Rate limit | Notas |
|---|---|---|---|---|---|
| `GET /api/admin/users` | `requireSuperAdmin` | — | `{ users: [...] }` con `clientAccess[]` | 60 / 60 s | Decora `email` desde `auth.users` (via service role) |
| `PATCH /api/admin/users/[id]` | `requireSuperAdmin` | `UpdateUserSchema` (`globalRole?`, `displayName?`) | `{ user }` | 30 / 60 s | Bloquea demover al último SUPER_ADMIN (400) |
| `POST /api/admin/users/[id]/client-access` | `requireSuperAdmin` | `GrantClientAccessSchema` (`clientId`) | `{ access }` | 60 / 60 s | Upsert — idempotente |
| `DELETE /api/admin/users/[id]/client-access/[clientId]` | `requireSuperAdmin` | — | `{ ok: true }` | 60 / 60 s | Idempotente (swallow de P2025) |
| `GET /api/admin/clients` | `requireSuperAdmin` | — | `{ clients: [...{accessCount}] }` | 60 / 60 s | — |
| `POST /api/admin/clients` | `requireSuperAdmin` | `CreateClientSchema` (`name`, `slug?`) | `{ client }` status 201 | 20 / 60 s | Auto-slug si falta. 409 si slug duplicado |
| `PATCH /api/admin/clients/[id]` | `requireSuperAdmin` | `UpdateClientSchema` (`name?`, `slug?`) | `{ client }` | 30 / 60 s | 409 si slug duplicado |
| `DELETE /api/admin/clients/[id]` | `requireSuperAdmin` | — | `{ ok: true }` | 10 / 60 s | Cascade delete vía Prisma — **irreversible** |

---

## Social / OAuth

`[platform]` acepta `instagram` / `tiktok` / `youtube` (validado con Zod).

| Método + path | Auth | Input | Output | Rate limit | Notas |
|---|---|---|---|---|---|
| `GET /api/social/[platform]/connect` | `requireActiveClient` | — (platform en path) | 302 redirect al provider | — | Persiste CSRF `OAuthState` TTL 10 min |
| `GET /api/social/[platform]/callback` | callback público (valida state) | `code`, `state` query | 302 redirect a `returnTo` | — | Exchange + upsert `SocialConnection`. Callback URL registrada literal en paneles externos — no renombrar sin actualizar provider |
| `DELETE /api/social/[platform]/disconnect` | `requireActiveClient` | — | `{ success: true }` | — | Idempotente (P2025 → success) |
| `GET /api/social/[platform]/status` | `getActiveClientId` (suave) | — | `{ connected, accountName?, accountPic?, connectedAt?, expiresAt? }` | — | Siempre 200; usa `connected` para decidir UI |

---

## YouTube

| Método + path | Auth | Input | Output | Rate limit | Notas |
|---|---|---|---|---|---|
| `POST /api/youtube/sync` | `requireActiveClient` | — | `{ ok, synced: { videos, snapshot } }` | — | Llama YouTube Data API. 404 `NOT_CONNECTED` si no hay `SocialConnection`. 502 `UPSTREAM_SHAPE_DRIFT` si los schemas `YT*` Zod no cuadran |
| `GET /api/youtube/channel-summary` | `requireActiveClient` | — | `{ connected, channel?, snapshot?, videosCount }` | — | Siempre 200 |
| `GET /api/youtube/videos?limit=&cursor=` | `requireActiveClient` | `YouTubeVideosQuerySchema` | `{ items[], nextCursor }` | — | Keyset pagination. `limit` default 25, max 100 |
| `GET /api/youtube/snapshots?limit=` | `requireActiveClient` | inline (`limit` default 90, cap 365) | `{ items: [{date, subscribers, totalViews, videoCount}] }` | — | Orden ascendente por `date` para chart |

---

## Instagram

| Método + path | Auth | Input | Output | Rate limit | Notas |
|---|---|---|---|---|---|
| `POST /api/instagram/sync` | `requireActiveClient` | — | `{ ok, synced: { reels, snapshot } }` | — | Meta Graph API v19. Mapea `code:190` → 401 `TOKEN_EXPIRED`; códigos 4/17/32 o `subcode:2446079` → 429 `RATE_LIMITED`. 502 `SYNC_FAILED` en shape drift |
| `GET /api/instagram/account-summary` | `getActiveClientId` (suave) | — | `{ connected, accountName?, latestSnapshot?, reelCount, tokenExpired? }` | — | Siempre 200 |
| `GET /api/instagram/reels` | `requireActiveClient` | — | `{ reels: UserReel[] }` | — | Read-only DB. Para refrescar, llamar `/sync` antes |

---

## Analizador + Copy + AI

| Método + path | Auth | Input | Output | Rate limit | Notas |
|---|---|---|---|---|---|
| `POST /api/analizador/scrape` | `requireActiveClient` | `ScrapeRequestSchema` (`username`, `limit` 1-50) | `{ jobId, items? }` | 5 / 60 s | Inicia run en Apify `apify~instagram-reel-scraper` |
| `POST /api/analizador/analyze` | `requireActiveClient` | `AnalyzeRequestSchema` (`caption?`, `transcript?`, `views?`, `likes?`, `comments?`) | `{ analysis }` | 20 / 60 s | Requiere `caption` o `transcript`. Claude (modelo `claude-sonnet-4-6`, max_tokens 1024). 503 si falta `ANTHROPIC_API_KEY` |
| `POST /api/copy/generate` | `requireActiveClient` | `GenerateRequestSchema` (`type`: reels-virales/reels-nicho/anuncios/ideas, `cantidad` 1-20, `categoria?`, `tono?`, `icpContext?`) | `{ items: [...] }` | 30 / 60 s | Claude. 503 si falta `ANTHROPIC_API_KEY` |
| `POST /api/ai/chat` | `requireActiveClient` | `AIChatSchema` (`conversationId?`, `content`, `model`, `context?: WorkspaceContextSchema`) | stream SSE + header `x-conversation-id` | 20 / 60 s | `maxDuration: 180`. Claude streaming. Crea `Conversation` si falta `conversationId`. Persiste `AIMessage` user + assistant con tokens/cost |
| `GET /api/ai/conversations` | `requireActiveClient` | — | `{ conversations: ConversationDTO[] }` | — | Max 100, ordenado por `updatedAt desc` |
| `POST /api/ai/conversations` | `requireActiveClient` | inline (`title?`) | `{ conversation }` status 201 | — | Crea conversación vacía |
| `GET /api/ai/conversations/[id]` | `requireActiveClient` | — | `{ conversation, messages[] }` | — | 404 si la conversation pertenece a otro `clientId` |
| `DELETE /api/ai/conversations/[id]` | `requireActiveClient` | — | `{ ok: true }` | — | Cascade de `AIMessage` vía Prisma |

---

## Contenido (content / tasks / ideas / guiones / bases)

| Método + path | Auth | Input | Output | Rate limit | Notas |
|---|---|---|---|---|---|
| `GET /api/content?type=` | `requireActiveClient` | — (query `type=reel\|historia`) | `{ contentPieces: [...] }` | — | Ordenado por `order` |
| `POST /api/content` | `requireActiveClient` | inline `CreateContentPieceSchema` (`title`, `type`, `status`, ...) | `{ contentPiece }` | — | — |
| `PATCH /api/content/[id]` | `requireActiveClient` | inline `UpdateContentPieceSchema` | `{ contentPiece }` | — | — |
| `DELETE /api/content/[id]` | `requireActiveClient` | — | `{ ok: true }` | — | — |
| `GET /api/content/templates?type=` | `requireActiveClient` | — | `{ templates: [...] }` | — | — |
| `POST /api/content/templates` | `requireActiveClient` | inline `CreateContentTemplateSchema` | `{ template }` | — | — |
| `PATCH /api/content/templates/[id]` | `requireActiveClient` | inline | `{ template }` | — | — |
| `DELETE /api/content/templates/[id]` | `requireActiveClient` | — | `{ ok: true }` | — | — |
| `GET /api/tasks` | `requireActiveClient` | — | `{ tasks: [...] }` | — | Ordenado por `columnId`, `order` |
| `POST /api/tasks` | `requireActiveClient` | inline `CreateTaskSchema` (`title`, `dueDate?`, ...) | `{ task }` | — | — |
| `PATCH /api/tasks/[id]` | `requireActiveClient` | inline `UpdateTaskSchema` | `{ task }` | — | — |
| `DELETE /api/tasks/[id]` | `requireActiveClient` | — | `{ ok: true }` | — | — |
| `GET /api/ideas` | `requireActiveClient` | — | `{ ideas: [...] }` | — | Ordenado `createdAt desc` |
| `POST /api/ideas` | `requireActiveClient` | inline `CreateIdeaSchema` (`title`, `format?`, `notes?`, `referenceUrl?`) | `{ idea }` | — | — |
| `PATCH /api/ideas/[id]` | `requireActiveClient` | inline `PatchIdeaSchema` | `{ idea }` | — | — |
| `DELETE /api/ideas/[id]` | `requireActiveClient` | — | `{ ok: true }` | — | — |
| `GET /api/guiones/tabs?type=` | `requireActiveClient` | — | `{ tabs: [{..., items: [...]}] }` | — | Incluye items ordenados |
| `POST /api/guiones/tabs` | `requireActiveClient` | inline `CreateTabSchema` (`name`, `type`, `emoji?`, `order?`) | `{ tab }` | — | — |
| `PATCH /api/guiones/tabs/[tabId]` | `requireActiveClient` | inline `PatchTabSchema` | `{ tab }` | — | — |
| `DELETE /api/guiones/tabs/[tabId]` | `requireActiveClient` | — | `{ ok: true }` | — | Cascade items |
| `POST /api/guiones/tabs/[tabId]/items` | `requireActiveClient` | inline `CreateItemSchema` (`title`, `content?`, `order?`) | `{ item }` | — | — |
| `PATCH /api/guiones/items/[itemId]` | `requireActiveClient` | inline `PatchItemSchema` | `{ item }` | — | — |
| `DELETE /api/guiones/items/[itemId]` | `requireActiveClient` | — | `{ ok: true }` | — | — |
| `GET /api/bases/context` | `requireActiveClient` | — | `{ context: { icp?, oferta?, ... } }` | — | Compone ICP + BusinessBase en texto plano para pasar a LLM |
| `GET /api/bases/icp` | `requireActiveClient` | — | `ICPProfile \| null` | — | — |
| `PUT /api/bases/icp` | `requireActiveClient` | inline `PutBodySchema` (`nombre?`, `edad?`, `dolores?`, `deseos?`, `creencias?`, ...) | `{ icp }` | — | Arrays se serializan como JSON string |
| `GET /api/bases/[key]` | `requireActiveClient` | — | `BusinessBase \| null` | — | `key` típico: `oferta`, `marca`, `tono`, etc. |
| `PUT /api/bases/[key]` | `requireActiveClient` | inline (`content?`, `items?`) | `{ base }` | — | — |

---

## Competitors + Reels

| Método + path | Auth | Input | Output | Rate limit | Notas |
|---|---|---|---|---|---|
| `GET /api/competitors` | `requireActiveClient` | — | `{ competitors: CompetitorDTO[] }` con `reelsCount` | — | — |
| `POST /api/competitors` | `requireActiveClient` | `CreateCompetitorSchema` (`username`, `limit`: 30/60/90) | `{ competitor, jobId }` | 5 / 60 s | `maxDuration: 300`. Kick-off Apify via `after()` |
| `GET /api/competitors/[id]` | `requireActiveClient` | — | `{ competitor, reels[] }` | — | `[id]` acepta CUID o username |
| `DELETE /api/competitors/[id]` | `requireActiveClient` | — | 204 | — | Cascade delete |
| `POST /api/competitors/[id]/refresh` | `requireActiveClient` | — | `{ jobId }` | 5 / 60 s | `maxDuration: 300`. Scraping incremental (scan `REFRESH_LIMIT=30`, filtra ya existentes) |
| `GET /api/reels/[id]` | `requireActiveClient` | — | `{ reel, transcription?, analyses[] }` | — | Analyses ordered `createdAt desc` |
| `POST /api/reels/[id]/transcribe` | `requireActiveClient` | — | `{ transcription }` | — | `maxDuration: 300`. Groq Whisper. Idempotente: devuelve existente sin re-llamar. SSRF defence: solo hosts `cdninstagram.com`, `fbcdn.net`. Errores: 410 `VIDEO_URL_MISSING`/`VIDEO_URL_EXPIRED`, 422 `VIDEO_URL_INVALID`, 502 `TRANSCRIPTION_FAILED` |
| `POST /api/reels/[id]/analyze` | `requireActiveClient` | `AnalyzeSchema` (`model`) | `{ analysis }` | — | `maxDuration: 120`. Claude tool_use. 400 `TRANSCRIPTION_REQUIRED` si no hay `Transcription` |
| `GET /api/reels/[id]/chat` | `requireActiveClient` | — | `{ messages: ChatMessageDTO[] }` | — | — |
| `POST /api/reels/[id]/chat` | `requireActiveClient` | `ChatSchema` (`content`, `model`) | stream SSE | — | `maxDuration: 120`. Claude streaming grounded en reel + analysis |
| `POST /api/reels/[id]/refresh-video-url` | `requireActiveClient` | — | `{ reel }` o 410 `REEL_NO_LONGER_AVAILABLE` | 5 / 60 s | `maxDuration: 120`. Re-scrapea últimos 30 reels del competidor, filtra por shortcode |

---

## Jobs

| Método + path | Auth | Input | Output | Rate limit | Notas |
|---|---|---|---|---|---|
| `GET /api/jobs/[id]` | `requireActiveClient` | — | `ScrapeJobDTO` con `progressPct` | 60 / 60 s | Polling endpoint. `completed` siempre 100; `running` con `actualCount=0` devuelve 0 |

---

## Errores comunes

Códigos y cuerpos reales observados en los handlers. Consumidores deben manejar al menos los cuatro primeros.

| Status | Body | Cuándo |
|---|---|---|
| `400` | `{ error: 'Invalid request', issues? }` | Body no pasa el schema Zod. `issues` solo en no-prod |
| `400` | `{ error: 'Invalid JSON body' }` | `req.json()` tiró parse error |
| `401` | `{ error: 'UNAUTHORIZED' }` | `requireUserId`/`requireProfile` falló. No hay sesión Supabase |
| `401` | `{ error: 'TOKEN_EXPIRED' }` | Token OAuth del provider vencido (Instagram específico) |
| `403` | `{ error: 'FORBIDDEN' }` | `requireSuperAdmin` falló, o PENDING intentando rutas MEMBER |
| `403` | `{ error: 'NO_ACTIVE_CLIENT' }` o `'NO_CLIENT_ACCESS'` o `'CLIENT_NOT_FOUND'` | `requireActiveClient` falló — sin cookie, sin fila en `ClientAccess`, o el client no existe |
| `404` | `{ error: 'NOT_CONNECTED' }` | No hay `SocialConnection` para el platform + client |
| `404` | `{ error: 'NOT_FOUND' }` / `{ error: 'Conversación no encontrada' }` | Recurso por id ausente o pertenece a otro tenant |
| `409` | `{ error: 'Slug already exists' }` | Prisma P2002 en creación/update de `Client` |
| `410` | `{ error: 'VIDEO_URL_MISSING' }` / `'VIDEO_URL_EXPIRED'` / `'REEL_NO_LONGER_AVAILABLE'` | CDN de Instagram expirado o reel ya no existe upstream |
| `422` | `{ error: 'VIDEO_URL_INVALID' }` | Host del videoUrl no está en la allowlist SSRF |
| `422` | `{ error: 'INVALID_BODY' }` / `'TRANSCRIPTION_REQUIRED' }` | Zod falló en reels/analyze (sin Transcription previa) |
| `429` | `{ error: 'Too many requests' }` / `'Rate limit exceeded' }` / `'rate_limited' }` / `'RATE_LIMITED' }` / `'TOO_MANY_REQUESTS' }` | `checkRateLimit` cerrado. Header `Retry-After` en notify-signup |
| `500` | `{ error: 'Error interno' }` | Excepción no categorizada — revisar Vercel Function logs |
| `500` | `{ error: 'IA no configurada' }` / `'APIFY_API_TOKEN no configurado' }` | Env var requerida ausente en prod |
| `502` | `{ error: 'UPSTREAM_SHAPE_DRIFT', endpoint, detail }` | La respuesta del provider (YouTube/Meta) no pasó el schema Zod — investigar breaking change upstream |
| `502` | `{ error: 'SYNC_FAILED' }` / `'TRANSCRIPTION_FAILED' }` / `'Error al iniciar el scraping' }` | Provider externo devolvió error no-retryable |
| `503` | `{ error: 'AI no configurado' }` | Provider LLM no configurado (copy / analyze) |

**Rate-limit headers**: `notify-signup` envía `Retry-After: 3600`. Otros endpoints no propagan headers de rate-limit hoy; el cliente debe hacer backoff simple en 429.
