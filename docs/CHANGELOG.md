# Changelog

Formato inspirado en [Keep a Changelog](https://keepachangelog.com), simplificado. Orden cronologico inverso. Agrupacion por sprint cuando aplica para evitar ruido de commits individuales.

Fechas en formato `YYYY-MM-DD` (UTC).

---

## [Unreleased]

Ver [`docs/ROADMAP.md`](./ROADMAP.md) — pendiente critico pre-prod y Sprint 5 planificado.

---

## [2026-04-22] — Sprint 6: handoff + hardening final

### Added

- Docs de handoff: `docs/BACKUP.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md` (este archivo) en PR #49.
- Docs de handoff: `docs/ONBOARDING.md` (guía primera semana), `docs/API.md` (tabla completa de las 40 rutas de `app/api/**`), `docs/ADMIN_RUNBOOK.md` (recetas operativas super-admin) en PR #50.
- Docs de handoff previos en este mismo sprint: `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/RUNBOOK.md` (PR #43, commit `63c3b95`).
- `docs/METRICS.md` — baseline de métricas con método reproducible para Lighthouse, checklist de a11y manual, y cálculo WCAG del contrast ratio brand (`#8E1F2F` sobre `#F5EDE3` = 7.58:1 — pasa AAA) (PR #48).
- `README.md` reescrito como entrypoint de handoff (PR #43).
- Prod OAuth callback URLs confirmadas en `docs/DEPLOYMENT.md` (PR #47).
- Guard workflow: `.github/workflows/guard.yml` — secret-scan sobre lineas anadidas en el diff (PR #39, commit `6061113`).
- `lib/crypto.ts` — helper AES-256-GCM para cifrado de tokens OAuth (round-trip + tamper + legacy-passthrough). **Wiring a `SocialConnection` pendiente** (PR #37, commit `bb696bb`). Ver ROADMAP.
- Unit tests: `lib/instagram/transform.ts` (12 tests, PR #40), `lib/youtube/transform.ts` (24 tests, PR #41), `lib/crypto.ts` (PR #37 + fix #42).

### Changed

- **Auth**: `AuthProvider` real — unica fuente de verdad de sesion/perfil/clients; `Sidebar` y `ClientSwitcher` consumen `useAuth()` en vez de fetchear `/api/me` localmente (PR #30, `d0100e5`).
- **Rate limit**: convergencia en un unico helper `checkRateLimit` con fail-OPEN por default cuando KV falta, opt-in strict via `RATE_LIMIT_STRICT=1`. Se elimino legacy `checkSignupRateLimit` con fallback LRU (inseguro en serverless) (PR #38 + PR #46).
- **Performance**: OAuth callback de social probe en paralelo via `Promise.all` (PR #31, `4706b60`). Sync IG/YT usa `Promise.allSettled` para upserts paralelos (PR #32, `006d0a3`). `requireActiveClient()` ejecuta profile + access lookup en paralelo (PR #33, `b10c50c`).
- **Hooks**: `usePeriod` y `useTab` ahora usan `router.replace` en vez de `router.push` — sin historia sucia al cambiar filtros (PR #35, `6747296`).
- **UI splits**: `RichEditor` (1395 LOC → 544 LOC orchestrator, PR #45), `CalendarioTab` + `SettingsModal` (PR #44).
- **Sidebar**: solo el href mas especifico queda activo — fix al item "Resumen" de `/admin` que quedaba invisible (PR #46).

### Fixed

- **`/admin/clients` 429 infinito** por rate-limit fail-closed con KV faltante (PR #46).
- YouTube hooks abortan fetches en `unmount` para evitar state-after-unmount (PR #34, `1f752d3`).
- Test de `lib/crypto`: tamper test ahora modifica caracter no-trailing en base64url para activar realmente la deteccion de manipulacion (PR #42, `12cfa96`).

### Schema

- `AccountSnapshot` ahora tiene discriminador `platform` + compound unique `(clientId, platform, date)` (PR #29, `d1e4a66`). Migracion `20260424000000_account_snapshot_platform` aplicada a prod. YT e IG filtran y upsertean por `platform`.

### Tests

- E2E: 3 tests en cuarentena por requerir fixture de auth (PR #36, `8c19a1d`): `create-reel-calendar`, `drag-calendar`, `generar-copy`. Ver ROADMAP para des-cuarentena.

---

## [2026-04-22] — Sprint 4: UI honesty + empty states

### Changed

- **12 tabs mock-driven** reemplazadas por `ComingSoonBanner` (empty states honestos): 4 en `components/tabs/`, 4 en `components/ads/`, 4 en `components/tiktok/` (PR #28, `b67a63f`).
- `/instagram/reels/[id]` ahora lee `UserReel` real (tenant-scoped) en vez de `lib/mock-data/reel-detail.ts`. Se agrega `ReelDetailSimple` como vista honesta minima (PR #27, `eedd041`).
- **Home**: removido panel mock de Instagram stats, reemplazado por CTA empty-state (PR #26, `54b4330`).
- **TopBar**: removidos chips mock de `VIEWS/FOLLOWERS/ENG.RATE` + deleted `lib/mock-data/global.ts` (PR #24, `5c7a5c1`).

### Added

- `hooks/useContentItems` — hook compartido con cache + inflight dedup: `HomeContent`, `StatsRow`, `WeekAgenda` consumen el mismo `/api/content` una sola vez (PR #25, `f66533f`).

### Fixed

- `/competitors` dedup `findMany` ahora scoped por `competitorId` (MH-01, PR #23).
- YouTube `safeParse` en 3 respuestas de YT API + guard contra `channelId` downgrade (PR #22).

---

## [2026-04-22] — Sprint 3: hardening final

### Added

- **Forgot-password flow**: modal en `/login` + pagina `/auth/reset-password` para el link que manda Supabase (PR #21, `ff5ff35`).
- `error.tsx` en 9 rutas con `ErrorBoundaryCard` compartido: `/admin`, `/admin/users`, `/admin/clients`, `/ads`, `/tiktok`, `/youtube`, `/ai`, `/pending-approval`, `/login` (PR #20, `c015c0f`).
- `lib/client-errors.ts` — helper `logClientError` unificado para surfacing de errores en UI; 4 consumers criticos (Sidebar, ClientSwitcher, UsersAdminClient, ClientsAdminClient) pasan de `alert()` / silent catch a `toast` + log estructurado (PR #19, `8634e2c`).

### Fixed

- `/ai` loading.tsx + kanban skeleton 3-cols (matches `KanbanBoard`) (PR #18, `3988c7e`).
- Middleware: removido `/api/debug` stale de `PUBLIC_API_PREFIXES`, agregado `/auth/reset-password`. CI push trigger main-only + concurrency group (PR #17, `ee5e902`).
- `/competidores`: restore prop `analyses` + badge "N analisis previos" (PR #16, `c863661`).
- `/admin`: 404 real (era shell@200) + redirect unauth a `/login` (PR #15, `c77aa43`).
- Hydration #418 en `GreetingBlock` + `ConversationSidebar` — computaciones de fecha diferidas a post-mount (PR #14, `5d4781f`).

---

## [2026-04-21] — Sprint 2: core security + YouTube real + signup redirect

### Added

- **`/auth/pending-approval` auto-redirect** post-signup (PR #13, `23168c7`): el handler de signup hace `router.push('/pending-approval')` en vez de mostrar mensaje inline.
- **YouTube real**: `/youtube` tabs leen `/api/youtube/{channel-summary,videos}`, drop del mock layer. Nuevo `/api/youtube/snapshots` para grafico historico de crecimiento (tenant-safe). `useYouTubeVideos` con cursor pagination + boton "Cargar mas". `/youtube/audiencia` en empty state (demografia requiere YT Analytics API, futuro) (PR #12, `61e4030`).
- **Skeletons** loading.tsx en 9 rutas + primitiva `Skeleton` shadcn-style (PR #11, `fbc914a`).
- **Eternity AI reel chat** persiste `inputTokens` / `outputTokens` / `costUsd` en `ChatMessage` (paridad con `AIMessage`). Migracion `20260423000000_add_chat_message_tokens` (PR #10, `8c81463`).

### Changed

- **Lint**: 41 → 0 warnings. Limpiados `eslint-disable` innecesarios, params sin uso, imports sin uso, `useMemo` en `RichEditor.filteredItems`, eslint-disable targeted con racional en IG CDN URLs y `scheduleHideBlockHandle` (PR #11).
- **Login**: removido checkbox "Recordarme" (era decorativo — Supabase persiste sesion por defecto sin opt-out). `/ventas` y `/meta-ads` eliminados por decision de producto (PR #3, `5cc7bbe`).
- **CI**: E2E smart trigger — corre en PRs a main, pushes a main, o `workflow_dispatch`. Feature branches sin install de Playwright (PR #3).
- **Login UI**: fullscreen video visible en mobile+desktop con overlay + glows (commit `0135933`). Brand port de `/pending-approval` al `/login` (ambient glow, brand mark, blur card — commit `6161e58`).

### Fixed

- **Security — 11 business routes** ahora envueltas en `requireActiveClient()` con tenant scope en `updateMany`/`deleteMany`: `analizador/{scrape,analyze}`, `copy/generate`, `bases/context` (critical cross-tenant leak previo), `tasks/[id]`, `content/[id]`, `content/templates/[id]`, `ideas/[id]`, `guiones/tabs/[tabId]`, `guiones/items/[itemId]`, `jobs/[id]` (PR #9).
- **Security — rate limit fail-CLOSED en prod** cuando KV falta o modulo opcional no carga (PR #9). Nota: esto se re-relajo a fail-OPEN en PR #46 para desbloquear admin sin KV, con opt-in strict via `RATE_LIMIT_STRICT=1`.
- **Security — cookie `activeClientId`** ahora `httpOnly: true`, `sameSite: 'lax'`, `secure` en prod (PR #9). `ClientSwitcher` migra a `/api/me` para leer el valor.
- **Security — Zod en `/api/youtube/videos`**: `YouTubeVideosQuerySchema` valida `limit` (1-100) y `cursor` (1-100 chars). Invalid input devuelve 400 (PR #9).
- **Auth UX**: backfill de `email` en `Profile` en cada login para que `UserMenu` muestre datos correctos (commit `dc4c631`).
- **CI deploy**: revert a `vercel deploy --prod` simple; `--prebuilt` rompia Prisma Client al no incluir `node_modules` (commit `9ceabbb`).
- **CI**: inyectar Supabase + DB env en job E2E para que Next.js webServer bootee (commit `fd7afae`).

### Removed

- `/ventas` (app/ + `components/ventas/VentasContent`) y `/meta-ads` — mockup estatico y duplicado de `/ads` respectivamente (PR #3).

---

## [2026-04-21] — Sprint 1: fundacion + anti-drift

### Added

- `CLAUDE.md` reescrito con claims verificados contra codigo (commit `3633af2`). Secciones: Produccion workflow, "Donde vive cada responsabilidad", "Errores reales", "Zonas protegidas".
- `scripts/check-claude-md.mjs` — validador de coherencia entre `CLAUDE.md` y codigo (6 checks: DB provider, rutas en ROUTES.md, npm scripts, Paths clave, modelos Prisma, tsconfig alias). Exit 1 en divergencia.
- `.github/workflows/ci.yml`: dos gates — "Brand consistency" y "CLAUDE.md coherence" — para que los docs no puedan divergir silenciosamente del codigo.

### Changed

- Coverage threshold Jest **eliminado** — era 40% aspiracional pero cobertura real ~14%. Drop en vez de bajar artificialmente (commit `dd31897`).
- Dedupe de deploy: eliminado `.github/workflows/deploy.yml` redundante (Vercel GitHub integration ya deployea en push a main). Luego restaurado en commit `c4b150f` porque el alias `seven-omega` no se estaba promoviendo.
- `.env.example`: switch `DATABASE_URL` de SQLite template a Postgres (schema ya era postgresql). Agregadas vars Supabase/Resend/Upstash. Fix del dev port.

### Fixed

- `app/api/debug/oauth-url` gated con `NODE_ENV !== 'development'` antes de ser eliminado en `0c23cb1` (hubiera leakeado shape de env vars en prod).
- `app/login` + `app/pending-approval`: reemplazo de `var(--x, #hex)` fallbacks y `#F5EDE3` hardcoded por CSS vars puras. `check:brand` ahora pasa.
- `lib/schemas/content.ts` **eliminado** — cero imports, divergia de los schemas inline de `app/api/content/*`.
- `__tests__/lib/schemas/scrape.test.ts`: alinear con schema (Instagram username max 30, no 100).
- `__tests__/lib/utils/formatDate.test.ts`: usar ISO local-time para no fallar en offsets UTC negativos.
- `middleware.ts`: drop de `/api/auth` de `PUBLIC_API_PREFIXES` (redundante — ya lo excluye el matcher).
- `docs/ROUTES.md`: agregadas `/competidores`, `/competidores/[username]`, `/login` (existian pero no estaban documentadas).
- `.gitignore`: excluir `CLAUDE.local.md`.

---

## Historico

Los commits pre-Sprint-1 (pre-`63eb498`) corresponden a la base heredada del repo y estan fuera del scope de este changelog. Para arqueologia de una linea especifica, usar `git log --follow <archivo>`.

---

by eternity
