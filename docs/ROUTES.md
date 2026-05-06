# Active Routes

> **Before marking any visual task "done", navigate each route below and verify
> the change renders correctly. Missing a route is the most common reason a UI
> task ships incomplete.**

| Route          | Component file                                  | Purpose                                                          |
| -------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `/`            | `app/page.tsx` → `components/home/HomeContent`  | Home / overview dashboard                                        |
| `/ads`         | `app/ads/page.tsx` → `AdsContent`               | Ads dashboard — Meta Ads + TikTok Ads centralizados              |
| `/ai`          | `app/ai/page.tsx` → `EternityAIContent`         | Eternity AI — streaming chat grounded on workspace data          |
| `/analizador`  | `app/analizador/page.tsx` → `AnalizadorContent` | Content analyzer (uses `app/api/analizador`)                     |
| `/bases`       | `app/bases/page.tsx` → `BasesContent`           | Knowledge bases / source library                                 |
| `/competidores` | `app/competidores/page.tsx`                    | Competitor list (scrape, refresh, open detail)                   |
| `/competidores/[username]` | `app/competidores/[username]/page.tsx` | Competitor detail — reels, transcribe, analysis, chat            |
| `/contenido`   | `app/contenido/page.tsx` → `ContenidoContent`   | Content workspace (editor + lists)                               |
| `/instagram`   | `app/instagram/page.tsx` → `InstagramContent`   | Instagram analytics view                                         |
| `/login`       | `app/login/page.tsx`                            | Supabase Auth — email/password. Redirects to `/` on success      |
| `/tareas`      | `app/tareas/page.tsx` → `KanbanBoard`           | Task kanban board                                                |
| `/tiktok`      | `app/tiktok/page.tsx` → `TikTokContent`         | TikTok analytics — 4 tabs (Dashboard, Videos, Tendencias, Audiencia) |
| `/youtube`     | `app/youtube/page.tsx` → `YouTubeContent`       | YouTube analytics — 3 tabs (Dashboard, Videos, Audiencia) + ConnectButton |
| `/pending-approval` | `app/pending-approval/page.tsx`            | Landing for PENDING users — shown until a SUPER_ADMIN approves them |
| `/admin`       | `app/admin/page.tsx`                            | Admin overview — counters (users, pendientes, clientes). SUPER_ADMIN only |
| `/admin/users` | `app/admin/users/page.tsx` → `UsersAdminClient` | User management — approve, role changes, manage client access. SUPER_ADMIN only |
| `/admin/clients` | `app/admin/clients/page.tsx` → `ClientsAdminClient` | Tenant management — create / edit / delete clients. SUPER_ADMIN only |

API routes live under `app/api/` (`analizador`, `copy`, `social/[platform]`, `youtube/*`, `admin/*`, `me/*`) and are not user-facing.

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

### Admin + auth APIs

- `GET /api/me` — current user's profile summary (id, email, role, activeClientId)
- `GET /api/me/clients` — clients the current user can switch to
- `POST /api/me/active-client` — set the `activeClientId` cookie (validates access)
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
- [ ] /ads         loads, tabs (Resumen, Meta Ads, TikTok Ads, Creativos) renderizan
- [ ] /ai          Eternity chat renders; nueva conversación, streaming, historial funcionan
- [ ] /analizador  loads, brand accents correct
- [ ] /bases       loads, brand accents correct
- [ ] /competidores  list renders; add/refresh competitor works
- [ ] /competidores/[username]  detail renders (reels, transcribe, analysis, chat)
- [ ] /contenido   loads, brand accents correct
- [ ] /instagram   loads, filters render (incl. ReelFilters, TimeFilter), ConnectButton visible
- [ ] /login       form renders; successful login redirects to /
- [ ] /tareas      kanban renders, drag works
- [ ] /tiktok      loads, tabs (Dashboard, Videos, Tendencias, Audiencia) renderizan
- [ ] /youtube     loads, tabs (Dashboard, Videos, Audiencia) renderizan
- [ ] /pending-approval  PENDING user lands here, sign-out works
- [ ] /admin       (SUPER_ADMIN) overview cards render; non-admin sees 404
- [ ] /admin/users (SUPER_ADMIN) table + filter + approve + access modal work
- [ ] /admin/clients (SUPER_ADMIN) table + create/edit/delete flows work
- [ ] Sidebar      TikTok + Ads aparecen correctamente; ClientSwitcher visible
- [ ] Sidebar      grupo ADMIN aparece solo para SUPER_ADMIN
- [ ] `npm run check:brand` passes
```

When this file changes (route added/removed/renamed), update the table **and**
the checklist in the same PR.
