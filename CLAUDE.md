# Content Dashboard 2.O

Brújula del proyecto — contexto **estable** verificado contra código. No lista pendientes (rotan). Estado real = código.

@docs/ROUTES.md
@docs/BRAND.md

Docs on-demand: [`docs/COMPETIDORES_CONTRACTS.md`](./docs/COMPETIDORES_CONTRACTS.md), [`README.md`](./README.md). Overrides locales: `CLAUDE.local.md` (gitignored).

---

## Producción — este proyecto YA está desplegado

| Sistema | Cómo se aplica un cambio |
|---|---|
| **Código** | `git push origin main` → `.github/workflows/{ci,deploy}.yml` |
| **Deploy** | Vercel (Node 20.x, Next.js). `deploy.yml` corre `vercel deploy --prod` tras push a `main`. PRs = preview URL |
| **DB** | Postgres en Supabase. Schema: `npx prisma migrate deploy`. RLS en Supabase dashboard |
| **Auth** | Supabase Auth. Usuarios/roles en Supabase dashboard |
| **Env vars prod** | Vercel dashboard — **no** en `.env.local` |
| **OAuth apps** | Meta Developer / Google Cloud / TikTok Developers. `redirect_uri` registrado literal |

"Arregla X" puede significar editar código **o** tocar un dashboard externo. Preguntar si no está claro.

---

## Stack (verificado en `package.json`)

Next.js 16.2.3 · React 19.2.4 · Tailwind v4 · `@base-ui/react` + shadcn · TipTap v3 · `@dnd-kit` · Recharts 3 · motion · Zod 4 · Prisma 6 + **Postgres** · Supabase Auth (`@supabase/ssr`) · `@anthropic-ai/sdk` · `groq-sdk` · Apify HTTP · Resend · `@upstash/ratelimit` (opt) · Jest · Playwright.

Path alias `@/*` → raíz del repo. Importar como `@/lib/db`.

---

## Dónde vive cada responsabilidad (verificado leyendo el código)

- **`proxy.ts`** (Next 16, ex-`middleware.ts`) — SOLO refresca la sesión de Supabase y redirige a `/login` si no hay user. Nada más.
- **`app/layout.tsx` + `lib/auth-bootstrap.ts`** — upsert de `Profile` con `globalRole: 'PENDING'`, redirect a `/pending-approval`, auto-set del cookie `activeClientId` al primer cliente accesible. El theme (eternity/govbidder) lo resuelve `getActiveThemeKey()` desde `lib/active-brand.ts`.
- **`lib/themes.ts`** — registry puro: `VALID_THEME_KEYS`, `ThemeKey`, `DEFAULT_THEME_KEY`, `isValidThemeKey`. Sin DB ni `next/*` imports → usable en server, client y tests.
- **`lib/active-brand.ts`** — `getActiveThemeKey()` server-only: lee cookie `activeClientId` + busca `Client.themeKey`. Fallback a `DEFAULT_THEME_KEY` ante cualquier error.
- **`next.config.ts`** — CSP y headers de seguridad (no están en `proxy.ts`).
- **`lib/auth-user.ts`** — helpers: `requireUserId()`, `requireProfile()`, `requireSuperAdmin()`, `requireActiveClient()` (devuelve `{ userId, clientId }`). Constante `ACTIVE_CLIENT_COOKIE = 'activeClientId'`.
- **`lib/supabase/{client,server,admin}.ts`** — browser / server-with-cookies / service-role (bypasa RLS, cached con `let` local).
- **`lib/db.ts`** — Prisma singleton vía `globalThis`. Export `{ db }`.
- **`lib/utils/ratelimit.ts`** — wrapper Upstash. Variantes: `checkRateLimit` (devuelve `{ success } | null`) y `checkSignupRateLimit` (IP, 3/hora). El shape es `.success` en todas las rutas hoy (la inconsistencia `.allowed` ya no existe).
- **`lib/claude/models.ts`** — registry de modelos Claude (Haiku 4.5 / Sonnet 4.6 / Opus 4.7) con precios por 1M tokens. Exporta `DEFAULT_MODEL` (Sonnet — usado en Competidores para que el user elija) y `CHEAP_MODEL` (Haiku — usado en jobs de alta frecuencia: summarize-transcript, analizador/analyze, copy/generate).

---

## Modelos Prisma (30 en `schema.prisma`)

`Profile` · `Client` · `ClientAccess` · `SocialConnection` · `OAuthState` · `Competitor` · `Reel` · `Transcription` · `Analysis` · `ChatMessage` · `ScrapeJob` · `Conversation` · `AIMessage` · `Task` · `ContentPiece` · `ContentTemplate` · `ICPProfile` · `BusinessBase` · `Idea` · `GuionTab` · `GuionItem` · `UserReel` · `Story` · `YouTubeVideo` · `AccountSnapshot` · `ContentResearchHistory` · `VideoFeedAccount` · `TranscriptHistory` · `DiscoveryResponse` · `IncomeRecord`.

`Task` tiene `assignedTo: String?` (Profile.id; null = sin asignar). `UserReel` tiene `mediaType: String?` ('VIDEO' | 'REELS' | 'IMAGE' | 'CAROUSEL_ALBUM'; null en filas legacy).

**Antes de usar un modelo**: `grep -n "^model " prisma/schema.prisma` para confirmar.

---

## Qué es real vs mock hoy (verificado con grep el 2026-05-13)

**Backend real**:
- `/api/admin/*` (SUPER_ADMIN CRUD de users/clients, con rate limit)
- `/api/me/*` (profile + active-client + global-stats)
- `/api/auth/notify-signup` (Resend, rate-limited 3/h por IP)
- `/api/social/[platform]/{connect,callback,disconnect,status}` (platforms: `instagram`, `tiktok`, `youtube`)
- `/api/instagram/{sync,reels,account-summary}` (real, no mock). `/reels` ahora paginado con `?cursor=&limit=` (default 100, max 200) — devuelve `{ reels, nextCursor }`.
- `/api/youtube/{sync,videos,channel-summary,snapshots}` (llama YouTube API real)
- `/api/analizador/{scrape,analyze}` (Apify + Claude **Haiku**, rate-limited)
- `/api/copy/generate` (Claude **Haiku**, rate-limited)
- `/api/competitors/[id]` y `/api/reels/[id]/{analyze,transcribe,chat,refresh-video-url}`
- `/api/ai/{chat, conversations, conversations/[id]}` (Eternity AI — Anthropic SDK streaming, rate-limited 20/min)
- `/api/transcript` (resumen con Claude Haiku), `/api/content-research`, `/api/video-feed`
- `/api/discovery` (POST persists `DiscoveryResponse`, GET SUPER_ADMIN only)
- `/api/tasks` y `/api/tasks/[id]` — soportan `assignedTo` para asignación por miembro.

**UI que lee mocks** (`grep -rln "lib/mock-data" app components`):
- `/instagram` — 3 tabs con fallback a mock cuando no hay data real (`DashboardTab`, `ReelsTab`, **`PublicacionesTab`** ahora wireada a UserReel filtrado por `mediaType IMAGE | CAROUSEL_ALBUM`) + 2 tabs demo-only con pill visible (`HistoriasTab`, `CompetenciaTab` — no hay backend para stories/competitor benchmarks) + `app/instagram/reels/[id]/page.tsx`
- `/youtube` — sólo `YouTubeAudienciaTab` (requiere YouTube Analytics API, scope extra)
- `components/home/HomeContent` (mock para charts; reales: greeting + métricas globales via `/api/me/global-stats`)
- `app/tiktok/TikTokContent.tsx` (mock + ComingSoonBanner)
- `app/ads/AdsContent.tsx` (mock + ComingSoonBanner)

**TopBar** ya NO usa mocks: lee `/api/me/global-stats` (real).

**TikTok backend incompleto**: el OAuth connect/callback está wireado (en `/api/social/[platform]/*`), pero **no existe `lib/tiktok/`** — no hay fetch de métricas implementado. La UI de `/tiktok` muestra ComingSoonBanner. **No aparece en sidebar.**

**`/competidores` NO usa mocks** — lee de DB real.

**Rutas escondidas del sidebar pero accesibles por URL**: `/analizador`, `/ads`, `/tiktok`, `/transcript`, `/content-research`. `/tareas` y `/video-feed` redirigen a `/contenido?tab=tareas` y `/instagram?tab=top30d` respectivamente.

---

## Paths clave (verificado con `ls`)

```
app/
  api/
    admin/{users,clients}/[id]/               # SUPER_ADMIN + requireSuperAdmin
    ai/{chat,conversations,conversations/[id]}/ # Eternity AI streaming chat
    analizador/{scrape,analyze}/              # Apify + Claude
    auth/notify-signup/                       # Resend
    bases/  content/  copy/generate/
    competitors/[id]/
    reels/[id]/{analyze,transcribe,chat,refresh-video-url}/
    guiones/  ideas/  instagram/  tasks/  jobs/[id]/
    me/{route,active-client,clients}/
    social/[platform]/{connect,callback}/     # instagram | tiktok | youtube
    youtube/{sync,videos,channel-summary}/
  {instagram,contenido,bases,analizador,competidores,tareas,ads,tiktok,youtube}/page.tsx
  ai/page.tsx                                  # ComingSoonBanner
  admin/{page,users,clients}/page.tsx
  pending-approval/  ·  login/

components/layout/{Sidebar,TopBar,ConditionalShell,ClientSwitcher,UserMenu,SettingsModal}.tsx
hooks/{usePeriod,useTab,useSocialConnection,useInstagramData,useYouTubeData}.ts
lib/
  supabase/{client,server,admin}.ts  ·  auth-user.ts  ·  auth-bootstrap.ts  ·  db.ts
  utils/ratelimit.ts  ·  useLocalStorage.ts  ·  schemas/{analizador,copy,competidores}/
  mock-data/                                  # Instagram/Ads/TikTok/YouTube UI (a eliminar)
  competidores/{active-jobs,resolve-competitor}.ts
proxy.ts  ·  next.config.ts  ·  prisma/{schema.prisma,migrations/}
scripts/{check-brand-consistency.mjs,seed-initial-clients.ts}
__tests__/  ·  e2e/                           # 3 unit + 3 e2e
```

---

## Comandos

```bash
# Dev
npm run dev
npm run seed                                  # seed-initial-clients.ts

# Validación pre-push
npm run lint  ·  npm run typecheck            # ✓ pasa hoy
npm run check:brand                           # ✓ pasa hoy
npm run test                                  # Jest — coverage threshold 40%
npm run test:e2e                              # Playwright (baseURL http://localhost:3000)
npm run build                                 # postinstall: prisma generate

# Prisma (Postgres en Supabase)
npx prisma studio
npx prisma migrate dev --name <nombre>
npx prisma migrate deploy                     # prod (CI)

# Búsquedas útiles
grep -rn "TODO\|FIXME" app lib components
grep -rn "lib/mock-data" app components       # UIs con datos falsos
grep -n "^model " prisma/schema.prisma        # modelos disponibles
```

---

## Reglas (no negociables)

- **Brand**: solo CSS vars (`var(--accent)`, `var(--foreground)`, etc.). Prohibido `#hex`, `rgb()`, `hsl()`, `bg-[#...]`. Ver `docs/BRAND.md`.
- **Rutas**: añadir/renombrar → actualizar `docs/ROUTES.md` + `components/layout/Sidebar.tsx` en el mismo commit.
- **Prisma**: siempre `import { db } from '@/lib/db'`. Nunca `new PrismaClient()`.
- **Tenant**: queries de negocio pasan por `requireActiveClient()`. Nunca leer `clientId` de body/query.
- **Zod**: todo input de API route se valida con schema en `lib/schemas/`. Nada de `as any`.
- **Rate limit**: `checkRateLimit()` en rutas que llaman LLMs o APIs externas. Confirmar el shape (`.success` vs `.allowed`) antes de copiar código.
- **Secrets**: variable nueva → primero a `.env.example`, luego valor a Vercel dashboard.

---

## Errores reales verificados

- **OAuth `redirect_uri`**: Meta / Google / TikTok registran la URL literal. Cambiar `app/api/social/[platform]/callback/` o `/api/auth/*` **requiere** actualizar el panel del proveedor antes del deploy.
- **App Router 100%**: `grep` confirma 0 usos de `getServerSideProps`, `getStaticProps`, `next/router`, `pages/api`. `useRouter` viene de `next/navigation`.
- **Next 15+ async APIs** (verificado en ≥5 handlers): `params` es `Promise<...>` → `await params`. `cookies()`, `headers()`, `draftMode()` también son async.
- **Rate limit con dos shapes**: admin usa `rl.success`, analizador usa `rl.allowed`. Copiar código entre módulos silenciosamente rompe.

---

## Zonas protegidas (confirmar antes de editar)

`proxy.ts` · `app/layout.tsx` (tiene la lógica real de bootstrap) · `lib/auth-bootstrap.ts` · `next.config.ts` · `prisma/schema.prisma` + `migrations/` · `lib/supabase/admin.ts` · `.github/workflows/*.yml` · `.env.example`.

---

## Verificación antes de "listo"

- **UI**: `preview_start` + `preview_screenshot`/`preview_snapshot` en browser. `tsc` limpio ≠ UX correcta.
- **API route**: `typecheck` + test del schema Zod + curl/UI real.
- **Auth / bootstrap**: probar signup PENDING, login MEMBER, login SUPER_ADMIN en preview de Vercel antes de merge.
- **Cambios de brand**: `check:brand` debe pasar tras cualquier edición de estilos.
- **Post-push**: confirmar build OK y preview funcional en Vercel dashboard antes de cerrar la tarea.
