# Content Dashboard 2.O

Content Dashboard 2.O es un workspace multi-tenant para análisis de contenido social (Instagram, YouTube, TikTok) con inteligencia artificial (Eternity AI) pensado para un equipo creativo. Permite a usuarios aprobados conectar cuentas, importar reels/videos, pedir análisis con Claude, transcribir audio con Groq/Whisper, escribir guiones y planificar contenido — todo aislado por cliente (`Client`) mediante control de acceso (`ClientAccess`) y una cookie `activeClientId`.

> Este README es el punto de entrada para desarrolladores nuevos. Para el contexto operativo (qué es real vs mock, reglas de código, zonas protegidas) consulta [`CLAUDE.md`](./CLAUDE.md). Para arquitectura, deploy y on-call, ver [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) y [`docs/RUNBOOK.md`](./docs/RUNBOOK.md).

---

## Stack

| Capa | Herramienta |
|---|---|
| Framework | Next.js 16.2.3 (App Router) |
| Runtime | React 19.2.4, Node.js 20.x |
| UI | Tailwind v4, `@base-ui/react`, shadcn, lucide-react |
| Editor | TipTap v3 |
| Drag & drop | `@dnd-kit` |
| Charts | Recharts 3 |
| Animacion | motion |
| Validacion | Zod 4 |
| ORM | Prisma 6 |
| DB | Postgres en Supabase (pooler + direct URL) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| IA | `@anthropic-ai/sdk` (Claude), `groq-sdk` (Whisper v3 turbo) |
| Scraping | Apify (HTTP) |
| Email | Resend |
| Rate limit | `@upstash/ratelimit` + `@vercel/kv` (opcional en dev) |
| Tests | Jest + Playwright |

Path alias `@/*` apunta a la raiz del repo (ej. `import { db } from '@/lib/db'`).

---

## Quickstart

```bash
# 1. Clonar
git clone https://github.com/CristianortizKing/content-dashboard.git
cd content-dashboard

# 2. Instalar dependencias (postinstall corre `prisma generate`)
npm install

# 3. Copiar plantilla de env y rellenar
cp .env.example .env.local

# 4. Aplicar migraciones contra la DB configurada en DATABASE_URL
npx prisma migrate deploy

# 5. Levantar dev server (http://localhost:3000)
npm run dev
```

El primer login crea un `Profile` con `globalRole: 'PENDING'` y redirige a `/pending-approval`. Para trabajar como MEMBER o SUPER_ADMIN, actualiza el campo `globalRole` en la DB (ver `docs/RUNBOOK.md`).

---

## Variables de entorno obligatorias

Lista completa y comentarios en [`.env.example`](./.env.example). Resumen:

| Variable | Scope | Uso |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | Base URL para OAuth callbacks |
| `DATABASE_URL` | secret | Prisma runtime (pooled, Supabase) |
| `DIRECT_URL` | secret | Prisma CLI / migraciones |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase Auth (cliente) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase Auth (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | Bypass RLS server-side |
| `ANTHROPIC_API_KEY` | secret | Claude (analisis, chat, copy) |
| `GROQ_API_KEY` | secret | Whisper v3 turbo (transcripcion) |
| `APIFY_API_TOKEN` | secret | Scraping de Instagram reels |
| `RESEND_API_KEY` | secret | Notificaciones de signup |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | secret | Rate limit (Upstash KV) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | secret | Rate limit signup (Upstash Redis directo) |
| `META_APP_ID` / `META_APP_SECRET` | secret | OAuth Instagram |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | secret | OAuth YouTube |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | secret | OAuth TikTok |
| `E2E_BASE_URL` | dev-only | URL base para Playwright |

Si faltan las vars de Upstash, el rate limiting queda **desactivado silenciosamente** en dev. Si falta `RESEND_API_KEY`, los emails de notificacion de signup se silencian (no bloquean el flujo).

---

## Comandos

```bash
npm run dev               # dev server en localhost:3000
npm run build             # build de produccion (postinstall: prisma generate)
npm run start             # servir el build
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm run check:brand       # verificar uso de CSS vars de marca
npm run check:claude-md   # validar coherencia de CLAUDE.md
npm run test              # Jest unit tests (coverage threshold 40%)
npm run test:watch        # Jest watch
npm run test:coverage     # Jest + coverage report
npm run test:e2e          # Playwright E2E
npm run seed              # scripts/seed-initial-clients.ts
```

Prisma:

```bash
npx prisma studio                          # GUI local
npx prisma migrate dev --name <nombre>     # dev: crea migracion + aplica
npx prisma migrate deploy                  # prod: aplica migraciones pendientes
```

---

## Deploy

El proyecto esta desplegado en Vercel. Cualquier push a `main` dispara `.github/workflows/deploy.yml`, que ejecuta `vercel deploy --prod` con el token del repo. Los PRs reciben una preview URL automatica de la integracion de Vercel con GitHub.

Antes del deploy, GitHub Actions corre en paralelo:

- `ci.yml` — `lint`, `typecheck`, `check:brand`, `check:claude-md`, tests unitarios con coverage, build. En PRs a `main` y pushes a `main` corre ademas E2E Playwright.
- `guard.yml` — scan de secretos en el diff (bloquea JWTs, `sk-ant-`, `sk-proj-`, `gsk_` y hardcoded `SUPABASE_SERVICE_ROLE_KEY`).

Las variables de entorno de produccion viven en el dashboard de Vercel, NO en `.env.local`. Ver [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) para el procedimiento completo, incluyendo OAuth callbacks y rollback.

---

## Documentacion relacionada

- [`CLAUDE.md`](./CLAUDE.md) — brujula estable: responsabilidades por archivo, modelos Prisma, reglas no negociables
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — overview del sistema, multi-tenant, auth, data layer
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — infra, pipeline, env vars, migraciones, rollback
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — recetas para on-call (errores de login, sync 401, etc.)
- [`docs/ROUTES.md`](./docs/ROUTES.md) — mapa de rutas activas y checklist visual
- [`docs/BRAND.md`](./docs/BRAND.md) — tokens de marca y sistema de color
- [`docs/COMPETIDORES_CONTRACTS.md`](./docs/COMPETIDORES_CONTRACTS.md) — contratos de API del modulo Competidores

---

by eternity
