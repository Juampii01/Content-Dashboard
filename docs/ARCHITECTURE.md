# Arquitectura — Content Dashboard 2.O

Audiencia: tech lead que audita la base. Documento estable, verificado contra el codigo en `main` (`c0a6c80`).

---

## Overview

```
                           ┌──────────────────────────────┐
                           │          Browser             │
                           │  (React 19 + Next.js 16)     │
                           └──────────────┬───────────────┘
                                          │ HTTPS
                                          ▼
                        ┌─────────────────────────────────┐
                        │   Next.js App Router (Vercel)   │
                        │  • middleware.ts (session)      │
                        │  • app/layout.tsx (bootstrap)   │
                        │  • app/api/**  (route handlers) │
                        └────┬────────┬────────┬────────┬─┘
                             │        │        │        │
         ┌───────────────────┘        │        │        └─────────────────┐
         ▼                            ▼        ▼                          ▼
┌──────────────────┐      ┌─────────────────────────┐        ┌──────────────────┐
│  Supabase Auth   │      │   Prisma 6 ORM          │        │   Upstash KV     │
│  (@supabase/ssr) │      │   (singleton, lib/db)   │        │  (rate limit)    │
└──────────────────┘      └────────────┬────────────┘        └──────────────────┘
                                       │
                                       ▼
                           ┌────────────────────────┐
                           │  Postgres (Supabase)   │
                           │  DATABASE_URL (pooled) │
                           │  DIRECT_URL  (migr.)   │
                           └────────────────────────┘

         External APIs invocadas por server routes:
         • Anthropic  (@anthropic-ai/sdk)  — analisis, chat Eternity AI, copy
         • Groq       (groq-sdk)           — transcripcion Whisper v3 turbo
         • Apify      (HTTP)               — scraping de Instagram reels
         • YouTube Data API                — /api/youtube/{sync,videos,channel-summary}
         • Resend                          — notificaciones de signup
         • Meta / Google / TikTok OAuth    — /api/social/[platform]/{connect,callback}
```

---

## Modelo multi-tenant

El eje del sistema son tres modelos de `prisma/schema.prisma`:

- **`Profile`** — 1:1 con el usuario de Supabase Auth (`id` = `auth.users.id`). Tiene `globalRole: PENDING | MEMBER | SUPER_ADMIN`.
- **`Client`** — workspace aislado (marca del cliente). Todo dato de negocio (reels, analisis, tareas, etc.) se referencia por `clientId`.
- **`ClientAccess`** — pivote `userId ↔ clientId` con `role: ClientRole`. Sin fila aqui, un MEMBER no puede operar sobre el `Client`.

La cookie **`activeClientId`** (constante `ACTIVE_CLIENT_COOKIE` en `lib/auth-user.ts`) determina el workspace activo. El bootstrap de `app/layout.tsx` la setea automaticamente al primer cliente accesible del usuario al cargar el layout tras login.

La puerta de entrada a cualquier ruta de negocio es:

```ts
import { requireActiveClient } from '@/lib/auth-user'

const { userId, clientId } = await requireActiveClient()
```

Esta funcion (`lib/auth-user.ts`):

1. Resuelve el usuario autenticado via Supabase (`requireUserId()`).
2. Lee la cookie `activeClientId`.
3. En paralelo consulta `Profile.globalRole` + la fila `ClientAccess` para ese `(userId, clientId)`.
4. Si `globalRole === 'SUPER_ADMIN'`, el acceso es universal (bypass del pivote).
5. Si no, la ausencia de `ClientAccess` lanza `ForbiddenError('NO_CLIENT_ACCESS')`.

Nunca se lee `clientId` de body/query/headers en rutas de negocio.

---

## Flujo de autenticacion

```
  signup  ──▶  Supabase Auth email/password  ──▶  confirma email  ──▶  /login
                                                                         │
                                                                         ▼
   middleware.ts  ◀────────  cookies de sesion Supabase (refresh SSR)
         │
         ▼
   app/layout.tsx + lib/auth-bootstrap.ts
         │
         ├── upsert Profile  (globalRole: PENDING por defecto)
         ├── si PENDING  ──▶  redirect /pending-approval
         ├── si MEMBER   ──▶  set cookie activeClientId al primer ClientAccess
         └── si SUPER_ADMIN ─▶ puede cambiar de Client via ClientSwitcher
```

- `middleware.ts` **solo** refresca la sesion y redirige a `/login` si no hay user. No hace mas que eso.
- `next.config.ts` aplica CSP y cabeceras de seguridad (no vive en el middleware).
- `lib/supabase/{client,server,admin}.ts` expone tres clientes: browser, server-con-cookies, service-role (el ultimo **bypasa RLS**, uso server-only).

La aprobacion de un usuario PENDING la hace un SUPER_ADMIN desde `/admin/users`, que cambia `globalRole` a `MEMBER` y crea filas de `ClientAccess` segun corresponda.

---

## Data layer

- **Singleton Prisma**: `lib/db.ts` exporta `{ db }` via `globalThis`. Regla: nunca `new PrismaClient()` fuera de ese archivo.
- **26 modelos** agrupados por dominio:

| Dominio | Modelos |
|---|---|
| Identidad y tenant | `Profile`, `Client`, `ClientAccess` |
| Social / conexion | `SocialConnection`, `OAuthState` |
| Competidores (Instagram) | `Competitor`, `Reel`, `Transcription`, `Analysis`, `ChatMessage`, `ScrapeJob` |
| IA (Eternity AI) | `Conversation`, `AIMessage` |
| Gestion de contenido | `Task`, `ContentPiece`, `ContentTemplate`, `Idea`, `GuionTab`, `GuionItem`, `UserReel`, `Story` |
| Bases de negocio | `ICPProfile`, `BusinessBase` |
| Metricas / ads | `YouTubeVideo`, `AccountSnapshot`, `IncomeRecord` |

- **Enums**: `GlobalRole` (`PENDING | MEMBER | SUPER_ADMIN`), `ClientRole`.
- Antes de usar un modelo: `grep -n "^model " prisma/schema.prisma` (la lista cambia).

---

## Convenciones de API

- Todas las rutas son **route handlers** de App Router (`app/api/**/route.ts`). No hay `pages/api/`.
- Input validado siempre con **Zod** (esquemas en `lib/schemas/`). Nada de `as any`.
- **`requireActiveClient()`** en toda ruta de negocio. `requireSuperAdmin()` en `/api/admin/*`.
- **Rate limit** via `checkRateLimit()` (wrapper Upstash en `lib/utils/ratelimit.ts`) en cualquier endpoint que hable con LLMs o servicios externos. Atencion: hay dos shapes en el codigo (`rl.success` en admin, `rl.allowed` en analizador) — **confirmar antes de copiar**.
- Errores tipados: `UnauthorizedError` (401) y `ForbiddenError` (403) de `lib/auth-user.ts`.

Ejemplo canonico (desde `lib/auth-user.ts`):

```ts
try {
  const { userId, clientId } = await requireActiveClient()
  // queries scoped por clientId
} catch (err) {
  if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (err instanceof ForbiddenError)   return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  throw err
}
```

---

## Renderizado

- **100% App Router**. `grep` confirma cero usos de `getServerSideProps`, `getStaticProps`, `next/router`, `pages/api`. `useRouter` viene de `next/navigation`.
- **Server Components por defecto**. Los Client Components (archivos con `'use client'`) viven en `components/` y se agrupan por modulo: `layout/`, `home/`, `tabs/`, `competidores/`, `contenido/`, `calendario/`, `bases/`, `tareas/`, `analizador/`, `shared/`, `ui/`.
- **Next 16 async APIs**: `params` en dynamic routes es `Promise<...>` — siempre `await params`. Lo mismo para `cookies()`, `headers()`, `draftMode()`.

---

## Observabilidad

- **Errores de cliente**: `lib/client-errors.ts` expone `logClientError` (captura + envia a endpoint interno).
- **Logs server**: `console.log` / `console.error` estructurados — visibles en **Vercel > Functions > Logs**.
- **Sin alerting custom** ni Sentry por ahora. Cualquier alerta viene del status de Vercel/Supabase.

---

## Background jobs

Hoy **no hay cron**. Las sincronizaciones son sync-on-demand, disparadas por POST desde la UI:

- `POST /api/youtube/sync` — trae videos recientes y crea `AccountSnapshot`.
- `POST /api/analizador/scrape` — encola job de Apify (reel scraping).
- `POST /api/analizador/analyze` — dispara analisis con Claude sobre un `Reel`.

Un scheduler programado (Vercel Cron o similar) esta previsto para Sprint 5 pero aun no existe en el repo.

---

## Zonas protegidas

Cambios en estos archivos requieren confirmacion previa:

- `middleware.ts`
- `app/layout.tsx` (bootstrap real del Profile)
- `lib/auth-bootstrap.ts`
- `next.config.ts` (CSP + headers)
- `prisma/schema.prisma` + `prisma/migrations/`
- `lib/supabase/admin.ts` (service role)
- `.github/workflows/*.yml`
- `.env.example`
