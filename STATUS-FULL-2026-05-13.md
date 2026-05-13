# Content Dashboard / Eternity — Historia completa hasta hoy

**Fecha:** 13 de mayo de 2026
**Autor:** Juan Pablo Acosta Caminos
**Cubre:** desde el día 1 (`Initial import`, 06-may-2026) hasta hoy (13-may-2026)
**Estado deploy:** corriendo en Vercel, push a `main` = deploy automático

> Para el resumen acotado al último sprint (10→13 mayo) ver
> [`STATUS-2026-05-13.md`](./STATUS-2026-05-13.md). Para el snapshot intermedio
> ver [`STATUS-2026-05-10.md`](./STATUS-2026-05-10.md).

---

## TL;DR de la línea de tiempo

| Fase | Fechas | Foco | Resultado |
|---|---|---|---|
| **0. Heredado** | 06-may | Initial import del dev anterior | Codebase base con auth, multi-tenant, IG/YT mockeados, modelos Prisma |
| **1. Polish + arquitectura** | 09-may | Refactors, a11y, CI, themes | Suspense skeletons, focus-rings, theme registry extraído, CI con prisma drift check |
| **2. Real data + ComingSoon** | 09-may (tarde) | Primer "no más mocks" | Ads/TikTok → ComingSoonBanner, TopBar con stats reales |
| **3. Snapshot** | 10-may | Reporte de estado | `STATUS-2026-05-10.md` |
| **4. Discovery + auth** | 11-may | Cuestionario estratégico | 40 preguntas, persistencia DB, viewer admin, revert auto-approve |
| **5. Sprint Instagram/TikTok** | 13-may | Sacar mocks de redes + costos | IG por @handle Apify, TikTok real, Stories live, Posts no-video, sidebar compactado |
| **6. Docs** | 13-may | Cierre | Refresh CLAUDE.md + ROUTES.md + status reports |

---

## Fase 0 — Día 1: lo que ya estaba (06-may, `ee64169`)

El proyecto **no se arrancó desde cero**. El commit inicial trajo un codebase del dev anterior con:

- Next.js 16.2.3 (App Router), React 19.2.4, Tailwind v4, Prisma 6 + Postgres en Supabase.
- Supabase Auth + bootstrap (`Profile` con `globalRole: PENDING`, redirect a `/pending-approval`).
- Multi-tenant via `ClientAccess` + cookie `activeClientId`.
- Sidebar / TopBar / theme system (govbidder / eternity).
- Modelos Prisma para casi todo lo que existe hoy: `Profile`, `Client`, `Competitor`, `Reel`, `Transcription`, `Analysis`, `Task`, `ContentPiece`, `ICPProfile`, etc.
- Rutas administrativas SUPER_ADMIN.
- `/competidores` real (Apify + Claude), `/copy/generate` real, `/analizador` real.
- Todo lo de Instagram / YouTube / TikTok / Ads en **mock**.
- Eternity AI streaming chat funcionando.
- OAuth de Meta / Google / TikTok pre-wireado en `app/api/social/[platform]/*`.

Documentación heredada: `CLAUDE.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `RUNBOOK.md`, `ROUTES.md`, `BRAND.md`, `COMPETIDORES_CONTRACTS.md`, `API.md`, `METRICS.md`, `ONBOARDING.md`, `ADMIN_RUNBOOK.md`, `BACKUP.md`, `CHANGELOG.md`, `ROADMAP.md`.

**El proyecto nunca arrancó productivamente** — siempre estuvo en desarrollo.

---

## Fase 1 — 09-may: features nuevas + polish técnico

### Features de research (commit `85a3378`)

Tres módulos nuevos enteros, backend + UI:

- **`/transcript`** — pegar URL de YouTube o Instagram, devuelve transcript + resumen IA. Stack: Apify (resolver) + Groq Whisper (IG) o scrape de la watch-page (YT) + Claude Haiku.
- **`/content-research`** — input de canal + timeframe, devuelve top 5 videos con análisis de Claude Haiku en batch.
- **`/video-feed`** — IG conectado, ranking de últimos 30 días. *(Más tarde se fusiona con `/instagram` y desaparece como ruta independiente.)*

Schema Prisma: + `TranscriptHistory`, `ContentResearchHistory`, `VideoFeedAccount`.
3 migraciones (`20260506180532`, `20260506193556`, `20260506195038`).
Dependencia nueva: `cmdk` para CommandPalette.

### Refactors + accesibilidad + CI

Cherry-picks de varios PRs (`#2`-`#9` de `govbidder`):

- **Next 16**: `middleware.ts` → `proxy.ts` (rename oficial Next 16).
- **A11y**: focus-visible rings, `aria-busy`, `aria-live`, labels + `aria-invalid` + `role=alert` en forms.
- **Images**: raw `<img>` → `next/image` (avatars, IG/YT thumbnails), CSP extendido.
- **Loading**: Suspense skeletons en transcript / content-research / video-feed.
- **Refactors**: extracción de `CopyButton`, `PlatformBadge`, helpers de format. Split de `TranscriptView` (488 LOC → componentes focales).
- **Brand**: `#B08A4A` hardcoded en Sidebar → token `--color-eternity-gold`.
- **Confirmations**: video-feed disconnect + content-research delete requieren confirm.
- **CI**:
  - `e2e` fail-soft cuando faltan secrets de Supabase.
  - **Prisma drift guardrail** — falla CI si `schema.prisma` y `migrations/` divergen.

### Fase 2 (mismo día) — primer recorte de mocks

- **`/ads` y `/tiktok` → `ComingSoonBanner`** (commit `efd5b3e`). Antes mostraban tablas/creativos falsos, ahora un placeholder limpio.
- **TopBar con métricas reales** (commit `52513d1`) — `/api/me/global-stats` agrega `AccountSnapshot` latest por plataforma. Se elimina `lib/mock-data/global`.
- **Theme registry extraído** (commit `0e4c306`) — `app/layout.tsx` se quedó sólo con bootstrap; `lib/themes.ts` registry puro (sin DB/`next/*` imports → usable en tests y client).

---

## Fase 3 — 10-may: snapshot intermedio

Commit `be43ee7` agrega `STATUS-2026-05-10.md` (207 líneas). Es el primer reporte formal: contexto, stack, doc existente, qué funciona / qué falta.

A esa fecha **Instagram / TikTok / Ads / Home seguían con mocks** y el flow de IG en UI todavía era el OAuth de Meta.

---

## Fase 4 — 11-may: Discovery + auth

Sprint corto pero denso. PRs `#1`-`#10` de `Juampii01`.

### Auth — toggle y revert

- `e96477b`: auto-approve de signups a `MEMBER` (atajo para testing).
- `0e5e62e`: **revert** — vuelve a `PENDING` por defecto. Quedó como el comportamiento productivo correcto.

### Discovery — 4 iteraciones

Discovery nació como un formulario genérico (`fe662d4`) y terminó como un cuestionario estratégico de 40 preguntas en 9 bloques:

1. `fe662d4` — form genérico inicial + link en sidebar.
2. `4e3b800` — reemplazo por las **40 preguntas estratégicas** (9 bloques).
3. `11b6cf4` — persistencia en DB (`DiscoveryResponse`) + **autosave a `localStorage`**.
4. `ba80c51` — el GET surface el error real de DB en la respuesta (antes morías sin info).
5. `78a26d0` — **split de `answers` JSONB en 40 columnas `q1`..`q40`**. Decisión: facilita queries y reportes; cuesta una migración fuerte pero pagó bien.
6. `bf03202` — fix del GET que seguía seleccionando la columna `answers` ya droppeada.

Visible para **cualquier user logueado**, incluso sin `ClientAccess` (caso de uso: el cliente lo contesta antes de ser onboardeado). Rate-limited 5/min por IP.

### Admin Discovery viewer

- `ce5a14a`: `/admin/discovery` (SUPER_ADMIN only) — accordion con los 9 bloques expandibles. Se extrajo el módulo de preguntas para que el viewer las renderice agrupadas.

### Pre-cleanup para el sprint del 13

- `ec88657`: Instagram tabs demo-only marcadas con `DemoDataPill` (transparencia con el cliente).
- `4282e64`: Home muestra métricas globales reales **arriba** del demo dashboard.
- `d5c7c1c`: `/ads` y `/tiktok` escondidos del sidebar; YouTube Audiencia marcado demo.
- `ff6898c`: 3 bugs chicos de Instagram del audit estático.
- `6f46c68`: **contenido + bases — silent data loss en editors** (los TipTap perdían cambios al cambiar de pieza si todavía estaba guardando). Fix con flush + lock.

---

## Fase 5 — 13-may: sprint Instagram / TikTok / costos

Día más denso del proyecto. PRs `#11`-`#15`.

### Costos + seguridad (`8045848`)

- Modelos de Claude **degradados a Haiku** en `summarize-transcript`, `analizador/analyze`, `copy/generate`. Ahorro ~85% sobre Sonnet para jobs de alta frecuencia.
- Tokens sociales **masked** en logs y en el endpoint `/status` — antes leakeaban en debug.
- `lib/claude/models.ts` formalizado con `DEFAULT_MODEL` (Sonnet, usado en `/competidores` donde el user elige) y `CHEAP_MODEL` (Haiku, usado en jobs internos).

### Sidebar compactado (`65b30ef`)

De 13 items a 8: **Home · Contenido · Bases · Instagram · YouTube · Competidores · AI · Admin**. Rutas absorbidas como tabs:

- `/tareas` → `/contenido?tab=tareas` (kanban como tab).
- `/video-feed` → `/instagram?tab=top30d`.

Rutas escondidas del sidebar pero accesibles por URL: `/analizador`, `/ads`, `/tiktok`, `/transcript`, `/content-research`.

### Tareas — asignación (`26d2942`)

- `Task.assignedTo: String? (Profile.id)` — null = sin asignar.
- Filtro "solo mías" en Kanban.
- Flow de claim — un click se la asigna al user actual.

### Instagram — refactor profundo

Cuatro commits que cambian la forma del módulo:

1. **`242cf56` — paginación cursor-based en reels**
   `/api/instagram/reels?cursor=&limit=` → `{ reels, nextCursor }`. Default 100, max 200. Antes era todo de una en una sola request — rompía con cuentas grandes.

2. **`4295ed9` — sync de posts no-video + `PublicacionesTab` real**
   El sync ahora trae imágenes y carruseles. `UserReel.mediaType` distingue (`VIDEO` / `REELS` / `IMAGE` / `CAROUSEL_ALBUM`). `PublicacionesTab` antes era mock — ahora lee `UserReel` filtrado por `IMAGE | CAROUSEL_ALBUM`.

3. **`3187158` — conexión por @handle (sin OAuth)**
   El cambio más estratégico del proyecto. Reemplaza el OAuth de Meta como **único entry-point** por un input de `@handle` que scrapea vía Apify. Detalle abajo.

4. **`11faca8` — `/video-feed` deriva de `UserReel`**
   Antes `/video-feed` pedía conectar Instagram **otra vez** (una segunda `SocialConnection`). Ahora deriva del mismo `UserReel`. La ruta `/video-feed` redirige a `/instagram?tab=top30d`.

5. **`fb33509` — Stories live**
   Módulo nuevo, Apify, ventana 24h, **no persistido** (las stories caducan). El tab muestra el estado actual del usuario.

### TikTok real (`76cd533`)

Análogo a IG: conectar por `@handle` → Apify → sync → grid de videos. La página existe y funciona pero **sigue escondida del sidebar** (decisión de producto).

### UI polish del sprint

- `2a45127`: skeletons en Kanban + Home metrics.
- `b3caafb`: overlay `?` con atajos de teclado.
- `6522183`: refresh de `CLAUDE.md` + `ROUTES.md` con todo lo nuevo.
- `03bc9cc`: fix de TS — `: never` en handler de redirect rompía build en Next 16.

---

## Instagram / Meta — el punto que importa

Esta es la zona del "quedó conectada la app de Meta pero no del todo". Acá la verdad:

### Lo que está hecho

1. **OAuth de Meta — implementado en código, sin UI**
   - Rutas: `app/api/social/[platform]/{connect,callback,disconnect,status}` con `platform = instagram`.
   - App de Meta creada en Meta Developer, `redirect_uri` registrado literal a la URL de prod.
   - `META_APP_ID`, `META_APP_SECRET` en Vercel.
   - **El botón de OAuth ya no se renderiza en `/instagram`** (sacado en `3187158`).

2. **Flow productivo: Apify por `@handle`**
   - `POST /api/instagram/connect-handle` con `{ handle }` → upsert `SocialConnection` con `accessToken = ''` y `scopes = 'apify-public'`.
   - Validación: lowercase, 1-30 chars, `[a-z0-9._]`. Rate-limited 10/min/IP.
   - No valida contra Apify al conectar (no quemar runs en typos) — el primer `/sync` valida.
   - `/api/instagram/sync` branchea: `accessToken === ''` → Apify; sino → Graph API. Devuelve `via: 'apify' | 'graph'` para que el cliente sepa.
   - El path Apify devuelve `viewsCount`, `sharesCount`, `durationSec` — campos que el scope básico de Graph API ni siquiera entrega.

3. **Posts, Reels, Stories — todo por Apify** (commits `4295ed9`, `242cf56`, `fb33509`).

### Lo que NO está hecho — el "no del todo"

- **No hay Meta App Review aprobada.** Sin ella, los scopes serios (`instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`) sólo funcionan para usuarios listados como tester. Para abrir a clientes reales habría que:
  - Publicar política de privacidad en URL real.
  - Grabar video demo del producto.
  - Justificar caso de uso para cada scope.
  - Esperar 2–8 semanas.
- **Decisión explícita:** producto interno con ~10 clientes conocidos → no vale la pena pasar App Review. Apify cubre la misma surface pública.
- **Tradeoffs del path Apify:**
  - **Sin Insights privados** (impressions, reach, save count, profile visits). Sólo lo que la página pública expone.
  - **Coste por sync** — cada `/sync` quema un run de Apify. 10 clientes × sync diario ≈ 300 runs/mes (5-15 USD según plan).
  - **Riesgo de bloqueo** — si Apify cambia el scraper o Meta endurece, el sync rompe sin aviso. El OAuth queda como fallback en código pero requiere reactivar UI.

---

## Estado real al 13-may por módulo

| Módulo | Estado | Notas |
|---|---|---|
| **/** (Home) | Real arriba, mock abajo | `/api/me/global-stats` da los KPIs; el dashboard demo queda como mock |
| **/ads** | ComingSoon | Esperando Meta Ads + TikTok Ads APIs |
| **/ai** (Eternity AI) | Real | Streaming Anthropic SDK, rate-limited 20/min, persiste conversaciones |
| **/analizador** | Real | Apify + Claude Haiku |
| **/bases** | Real | TipTap, fix de silent data loss aplicado |
| **/competidores** | Real | Apify + Claude (Sonnet default, user elige) |
| **/competidores/[username]** | Real | Reels + transcribe + análisis + chat |
| **/contenido** | Real | Pipeline · Tareas · Cal. Reels · Cal. Historias · Guiones × 2 · Copy IA |
| **/discovery** | Real | 40 preguntas, 9 bloques, autosave + persist |
| **/instagram** | **Real (Apify)** | Dashboard, Reels, Top 30d, Historias, Publicaciones reales; Competencia/Referencias/Demografía con `DemoDataPill` |
| **/tiktok** | Real (Apify) | Escondido del sidebar pero funciona por URL |
| **/youtube** | Real (Dashboard + Videos) | Audiencia con `DemoDataPill` (falta Analytics API) |
| **/transcript** | Real | YT + IG, Apify + Groq Whisper + Claude Haiku |
| **/content-research** | Real | YT Data API + Apify + Claude Haiku batch |
| **/admin/** | Real | Users, Clients, Discovery viewer |

---

## Modelos Prisma — qué se agregó / cambió

Desde el initial import:

- **+ `TranscriptHistory`** (mig `20260506193556`) — historial de transcripts.
- **+ `ContentResearchHistory`** (mig `20260506195038`) — historial de content research.
- **+ `VideoFeedAccount`** (mig `20260506195038`) — quedó pero hoy no se usa (video-feed se unificó con UserReel).
- **+ `DiscoveryResponse`** con 40 columnas `q1..q40` (mig de discovery).
- **~ `Task`** — `assignedTo: String?` agregado.
- **~ `UserReel`** — `mediaType: String?` agregado.
- **~ `Client`** — `themeKey` para selector de tema por tenant.

Total hoy: **30 modelos** en `schema.prisma`.

---

## Variables de entorno críticas

| Var | Para qué | Crítica? |
|---|---|---|
| `APIFY_TOKEN` | IG, TikTok, Competidores, content-research | **SÍ** — single point of failure de todo sync de redes |
| `ANTHROPIC_API_KEY` | Claude (Eternity AI, summarize, analyze) | SÍ |
| `GROQ_API_KEY` | Whisper para transcribir IG | SÍ (sólo para /transcript de IG) |
| `RESEND_API_KEY` | Notify-signup | Opcional |
| `META_APP_ID`, `META_APP_SECRET` | OAuth IG | **Inactivo** en flow productivo, mantener por si se retoma |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limit | Opcional (degrada a permissive si falta) |
| `YOUTUBE_API_KEY` | YouTube Data API | SÍ (para /youtube y /content-research) |
| Supabase (URL + anon + service role) | Auth + DB | SÍ |

---

## Qué queda abierto si se retoma

1. **YouTube Audiencia** — falta scope de Analytics API.
2. **Instagram: Competencia / Referencias / Demografía** — no hay backend (siguen con `DemoDataPill`).
3. **Ads** — `ComingSoonBanner`. Wirear Meta Ads + TikTok Ads.
4. **Decisión Meta App Review** — sólo si se abre el producto a usuarios sin onboarding manual.
5. **Stories persistidas** — si se quiere historial, montar un Vercel cron que las snapshote antes que caduquen.
6. **TikTok visible en sidebar** — la página funciona, sólo falta destaparla cuando producto lo apruebe.

---

## Verificación pre-merge (siempre)

```bash
npm run lint
npm run typecheck
npm run check:brand
npm run test
npm run build
```

Recorrer la **checklist visual** de `docs/ROUTES.md` antes de mergear cualquier cambio que toque UI.

---

## Anexo — todos los commits productivos en orden

(Excluye merges. Formato: `fecha hash mensaje`.)

```
2026-05-06  ee64169  Initial import (codebase heredado)

— Fase 1+2 (09-may) —
2026-05-09  85a3378  feat: transcript, content-research, video-feed + UI polish
2026-05-09  d6cff67  chore(next16): middleware.ts → proxy.ts
2026-05-09  0a0a834  fix(content-research): require confirmation before delete
2026-05-09  8af5546  fix(video-feed): require confirmation before disconnect
2026-05-09  01742ca  fix(a11y): labels + aria-invalid + role=alert en forms
2026-05-09  1a41e03  fix(images): next/image para IG/YT + CSP allowlist
2026-05-09  0aacfdc  fix(images): next/image para avatars
2026-05-09  a2d8ccb  feat(loading): Suspense skeletons en transcript/research/feed
2026-05-09  76c77e5  fix(sidebar): hardcoded gold → token
2026-05-09  7cdaf9e  fix(a11y): focus-visible + aria-busy/aria-live
2026-05-09  5b0c89d  refactor(format): unify fmt/formatDate
2026-05-09  a36039a  refactor(ui): extract PlatformBadge
2026-05-09  4ec202b  refactor(ui): extract CopyButton
2026-05-09  afecff4  refactor(transcript): split 488-LOC view
2026-05-09  fe45916  ci(e2e): fail-soft sin secrets
2026-05-09  90fc527  ci(prisma): schema drift guardrail
2026-05-09  efd5b3e  feat(ads, tiktok): mock-laden tabs → ComingSoonBanner
2026-05-09  52513d1  feat(topbar): real global stats from API
2026-05-09  0e4c306  refactor(themes): extract theme registry

— Fase 3 (10-may) —
2026-05-10  be43ee7  docs: initial status report (2026-05-10)

— Fase 4 (11-may) —
2026-05-11  e96477b  auth: auto-approve signups as MEMBER (luego revert)
2026-05-11  fe662d4  discovery: generic intake form
2026-05-11  4e3b800  discovery: 40-question strategic questionnaire
2026-05-11  11b6cf4  discovery: persist + autosave draft
2026-05-11  ba80c51  discovery: surface real DB error
2026-05-11  78a26d0  discovery: split JSONB into 40 columns
2026-05-11  bf03202  discovery: fix GET selecting dropped column
2026-05-11  0e5e62e  auth: revert auto-approve to PENDING
2026-05-11  ec88657  instagram: DemoDataPill en tabs demo-only
2026-05-11  4282e64  home: real global stats above demo dashboard
2026-05-11  d5c7c1c  sidebar: hide /ads + /tiktok, mark YT Audiencia demo
2026-05-11  ce5a14a  admin: /admin/discovery viewer + extract questions
2026-05-11  ff6898c  instagram: 3 small UX bugs from audit
2026-05-11  6f46c68  contenido+bases: stop silent data loss in editors

— Fase 5 (13-may) —
2026-05-13  8045848  cost + security: Haiku for utility routes; mask tokens
2026-05-13  65b30ef  sidebar: compress to 8 items + absorb duplicates
2026-05-13  242cf56  instagram: cursor-based pagination on reels
2026-05-13  26d2942  tareas: Task.assignedTo + 'solo mías' + claim
2026-05-13  4295ed9  instagram: sync non-video posts + PublicacionesTab real
2026-05-13  2a45127  ui: skeletons en Kanban + Home metrics
2026-05-13  b3caafb  ui: '?' keyboard shortcuts overlay
2026-05-13  6522183  docs: refresh CLAUDE.md + ROUTES.md
2026-05-13  03bc9cc  fix: drop ': never' return type on redirect handler
2026-05-13  3187158  instagram: connect by @handle via Apify (no Meta OAuth)
2026-05-13  11faca8  video-feed: derive from UserReel — kill duplicate IG conn
2026-05-13  76cd533  tiktok: real module via Apify
2026-05-13  fb33509  instagram: stories module via Apify (24h window)
2026-05-13  a8c695f  docs: status report 2026-05-13 — sprint summary + Meta state
```
