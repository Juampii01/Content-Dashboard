# Onboarding — Content Dashboard 2.O

Audiencia: developer nuevo en su primera semana. El [`README.md`](../README.md) es el quickstart mecánico (clone, install, run); este doc es la guía para **entender el sistema**: por qué las cosas están donde están, qué leer, qué probar, qué evitar.

Distribución sugerida en cinco días. Si vas más rápido, perfecto — pero no saltes los gotchas.

---

## Día 1 — Setup local y primer `npm run dev`

Sigue el [`README.md`](../README.md) hasta tener `http://localhost:3000` respondiendo. Detalles que el README no profundiza:

### Variables mínimas para arrancar

El repo tiene validación blanda: la mayoría de features se degradan silenciosamente si falta la env var (ej. Upstash → rate limiting desactivado; Resend → email no envía). Pero hay **tres grupos de variables obligatorios** para que el dev server no crashee al primer request:

| Grupo | Variables | Sin estas ¿qué falla? |
|---|---|---|
| App URL | `NEXT_PUBLIC_APP_URL` | OAuth callbacks no se arman bien |
| Database | `DATABASE_URL`, `DIRECT_URL` | Cualquier ruta que toque Prisma explota |
| Supabase Auth | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `/login` no funciona, middleware tumba sesión |

Opcionales en dev (pero obligatorios para tocar su feature):

| Feature | Variables |
|---|---|
| Eternity AI / análisis / copy | `ANTHROPIC_API_KEY` |
| Transcripción de reels | `GROQ_API_KEY` |
| Scraping competidores / analizador | `APIFY_API_TOKEN` |
| OAuth Instagram | `META_APP_ID`, `META_APP_SECRET` |
| OAuth YouTube | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OAuth TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` |
| Email de signup | `RESEND_API_KEY` |
| Rate limit | `KV_REST_API_URL` + `KV_REST_API_TOKEN` y/o `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |

La lista completa y comentada vive en [`.env.example`](../.env.example).

### Primera cuenta de prueba

1. Abre `http://localhost:3000` → redirige a `/login`.
2. Haz signup con un email real. El flujo crea un `Profile` con `globalRole: 'PENDING'` (ver `lib/auth-bootstrap.ts`).
3. Te redirige a `/pending-approval`.
4. Para promoverte, ve a **Supabase dashboard → Table Editor → Profile** y cambia tu `globalRole` a `SUPER_ADMIN`. Relogéate.

Con eso puedes operar como super admin en local y aprobar futuros signups desde la UI (`/admin/users`).

---

## Día 2 — Lectura guiada del código

Lee en este orden. No intentes entender todo, solo la responsabilidad de cada pieza.

### 1. `middleware.ts`

Edge middleware. Solo refresca la cookie de sesión de Supabase y redirige a `/login` si no hay user. Nada más. Es edge-safe: no toca Prisma, no toca Profile. Propaga el pathname via header `x-pathname` para que los server components lo vean.

### 2. `app/layout.tsx` + `lib/auth-bootstrap.ts`

El layout server llama a `bootstrapAuth()` en cada request. Ahí ocurre todo lo que middleware **no** puede hacer (porque Prisma no corre en edge):

- Upsert del `Profile` en primer login (`globalRole: 'PENDING'` por defecto)
- Redirect a `/pending-approval` si el user sigue PENDING
- Set automático de la cookie `activeClientId` al primer client accesible

Si `bootstrapAuth()` falla, silenciosamente no-opea para no blanquear la página.

### 3. `lib/auth-user.ts`

Las helpers que vas a usar en casi todo route handler. Léelo entero — son ~150 líneas:

- `requireUserId()` → UUID del user autenticado o lanza `UnauthorizedError`
- `requireProfile()` → `{ userId, globalRole, profile }`
- `requireSuperAdmin()` → enforce rol global
- `requireActiveClient()` → `{ userId, clientId }` validado contra `ClientAccess`. **Esta es la que más usas** para rutas de negocio scoped por tenant
- `getActiveClientId()` → lee la cookie sin validar (útil cuando `connected:false` es válido)
- Constante exportada `ACTIVE_CLIENT_COOKIE = 'activeClientId'`

Los errores `UnauthorizedError` (→ 401) y `ForbiddenError` (→ 403) son los que cada route mapea a respuestas HTTP.

### 4. Una ruta API cualquiera: `app/api/me/route.ts`

Patrón canónico para GET + PATCH protegidos por sesión:

```ts
const { userId, globalRole, profile } = await requireProfile()
// ... PATCH valida con z.object({...}).safeParse(body)
```

Corre `curl http://localhost:3000/api/me` (sin cookie) → verás `{"error":"UNAUTHORIZED"}` con status 401.

### 5. Una página client-component: `app/instagram/page.tsx` → `InstagramContent`

Rutea a un client component que consume hooks (`useInstagramData`, `useSocialConnection`). Los hooks van contra `/api/instagram/account-summary` y `/api/instagram/reels`. Nota: **partes de la UI siguen leyendo mocks** de `lib/mock-data/` (verificable con `grep -rn "lib/mock-data" app components`) — esto es intencional y lo cubre `CLAUDE.md` en la sección "Qué es real vs mock hoy".

---

## Día 3 — Ciclo de un cambio

### Branches y commits

```bash
git checkout -b <tipo>/<scope>-<descripcion-corta>
# Ejemplos reales del historial:
#   feat/youtube-snapshots-chart
#   fix/admin-rate-limit-shape
#   docs/handoff-onboarding-api-admin
```

No hay un linter de commit message obligatorio, pero el historial del repo sigue prefijos convencionales (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`). Mantén el estilo.

### Validaciones locales antes de pushear

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit (requerido — CI lo corre)
npm run check:brand   # CSS vars de marca — prohibe #hex, rgb(), etc.
npm run test          # Jest, coverage threshold 40%
```

### CI

Cada PR dispara `.github/workflows/ci.yml`, que corre todo lo anterior más build. PRs a `main` también corren E2E Playwright. `.github/workflows/guard.yml` escanea el diff por secretos (bloquea JWTs, `sk-ant-`, `sk-proj-`, `gsk_`, `SUPABASE_SERVICE_ROLE_KEY` hardcoded).

### Preview URL

La integración de Vercel con GitHub crea una preview URL automática en cada PR. Úsala para verificar UX real antes de pedir review — tipo check no garantiza que la página no esté blanca.

### Merge → prod

Push a `main` dispara `.github/workflows/deploy.yml`, que corre `vercel deploy --prod`. No hay staging intermedio.

---

## Día 4 — El tenant model

Esto es lo más específico del proyecto. Sin entenderlo, cualquier ruta de negocio que toques va a filtrar datos entre clientes.

### Roles globales (`Profile.globalRole`)

Tres valores, enum Prisma:

- `PENDING` — signup recién hecho, sin acceso a nada. Middleware + bootstrap redirigen a `/pending-approval`.
- `MEMBER` — user aprobado. Accede a los clientes listados en su `ClientAccess`.
- `SUPER_ADMIN` — bypass total. Ve y edita todos los clientes. Único rol que puede aprobar, promover, crear/borrar clientes, conceder accesos.

### Transición PENDING → MEMBER

Solo un `SUPER_ADMIN` la ejecuta desde `/admin/users`. El flujo:

1. User hace signup → POST `/api/auth/notify-signup` envía email a `SUPER_ADMIN_EMAIL` (si Resend está configurado).
2. Super admin abre `/admin/users`, filtra Pendientes.
3. Click en "Aprobar" → PATCH `/api/admin/users/[id]` con `{ globalRole: 'MEMBER' }`.
4. Opcionalmente, abrir modal "Acceso" → POST `/api/admin/users/[id]/client-access` con `{ clientId }` para cada cliente al que se le da permiso.

### `ClientAccess` y `activeClientId`

- `ClientAccess` es la tabla pivote `(userId, clientId)` con un `roleInClient` (hoy solo `ACCESS`).
- La cookie `activeClientId` decide **qué cliente ve la UI en este momento**. La setea el `ClientSwitcher` vía POST `/api/me/active-client`.
- `requireActiveClient()` en cada API route valida que el user tenga acceso al `clientId` de la cookie y devuelve `{ userId, clientId }`. Si no hay cookie → 403 `NO_ACTIVE_CLIENT`. Si no hay acceso → 403 `NO_CLIENT_ACCESS`.
- `SUPER_ADMIN` bypasea `ClientAccess`: cualquier client existente es accesible, aunque no tenga fila en la tabla.

### Regla de oro

**Nunca leas `clientId` desde el body o query**. Siempre derívalo de `requireActiveClient()`. Aislamiento por tenant = filtrar todos los `findMany`/`findUnique` por el `clientId` resuelto del server.

---

## Día 5 — Gotchas confirmados (CLAUDE.md)

Todos estos están documentados en [`CLAUDE.md`](../CLAUDE.md); aquí los resumo con contexto.

### Rate limit con dos shapes históricos

`lib/utils/ratelimit.ts` fue el wrapper original; luego hubo un intento paralelo en `lib/rate-limit/signup.ts`. El shape devuelto **era distinto** (`rl.success` vs `rl.allowed`), lo cual rompía al copiar código entre módulos. Hoy está unificado en `rl.success`, pero si ves código viejo con `.allowed`, es deuda. Confirma siempre el retorno antes de copiar.

### OAuth callback URLs fijas en paneles externos

`META_APP_ID`/`GOOGLE_CLIENT_ID`/`TIKTOK_CLIENT_KEY` tienen registradas en el panel del proveedor URLs literales tipo `https://<domain>/api/social/<platform>/callback`. Si renombras esa ruta, renombras el archivo, o cambias el dominio — tienes que actualizar el panel externo antes del deploy o el OAuth tira 400. Misma regla para `/api/auth/*`.

### Next 16 async APIs

Verificado en ≥5 handlers del repo:

```ts
// params ahora es Promise
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
}

// cookies(), headers(), draftMode() también son async
const store = await cookies()
const h = await headers()
```

Si ves código que hace `const { id } = params` sin await, es un bug.

### App Router 100%

`grep` confirma 0 usos de `getServerSideProps`, `getStaticProps`, `next/router`, `pages/api`. `useRouter` siempre viene de `next/navigation`. Si tienes el reflejo de `pages/` de Next 12/13, desactívalo.

### Prisma singleton via `@/lib/db`

Siempre `import { db } from '@/lib/db'`. Nunca `new PrismaClient()` en un handler — causa leaks de conexiones. El singleton vive en `globalThis` para sobrevivir al HMR en dev.

---

## Zonas protegidas — qué NO tocar sin pensar

Lista textual de [`CLAUDE.md`](../CLAUDE.md) § "Zonas protegidas". Si tienes que tocar algo aquí, abre un PR específico y pide review humano:

- `middleware.ts` — edge-safe por diseño, romper esto tumba la sesión de todos
- `app/layout.tsx` — tiene la lógica real de bootstrap
- `lib/auth-bootstrap.ts`
- `next.config.ts` — CSP + headers de seguridad
- `prisma/schema.prisma` + todo `prisma/migrations/` — cualquier edit necesita `npx prisma migrate dev` antes de commitear
- `lib/supabase/admin.ts` — service-role client, bypasa RLS
- `.github/workflows/*.yml`
- `.env.example` — fuente de verdad del contrato de env vars

Y aunque no es "zona protegida" formalmente, evita tocar **`docs/ROUTES.md`** sin actualizarlo cuando añadas o renombres una ruta.

---

## Qué leer después

- [`CLAUDE.md`](../CLAUDE.md) — la brújula estable. Releerla cada semana en los primeros dos meses.
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — overview del sistema.
- [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) — infra, pipeline, OAuth callbacks, rollback.
- [`docs/RUNBOOK.md`](./RUNBOOK.md) — recetas on-call.
- [`docs/API.md`](./API.md) — referencia de todas las rutas API, con schemas Zod y rate limits.
- [`docs/ADMIN_RUNBOOK.md`](./ADMIN_RUNBOOK.md) — para cuando te toque guiar a un super admin del cliente.

Bienvenida/o.
