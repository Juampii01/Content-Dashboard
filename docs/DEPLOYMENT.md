# Deployment — Content Dashboard 2.O

Audiencia: ops / devops que toma el proyecto. Verificado contra `.github/workflows/` y `.env.example` en `main` (`c0a6c80`).

---

## Infraestructura

| Componente | Proveedor | Notas |
|---|---|---|
| Hosting app | **Vercel** | Node 20.x, Next.js 16 (App Router). Region por default del proyecto |
| Base de datos | **Supabase Postgres** | Dos URLs: `DATABASE_URL` (pooler, puerto 6543, `pgbouncer=true`) para la app y `DIRECT_URL` (puerto 5432) para migraciones |
| Auth | **Supabase Auth** | Via `@supabase/ssr`. RLS gestionado desde Supabase dashboard |
| OAuth apps | Meta Developers, Google Cloud Console, TikTok Developers | 1 app por plataforma; callback URL registrada literal |
| Rate limit | **Upstash** (KV + Redis REST) | Opcional en dev; requerido en prod para evitar abuso de LLMs |
| Storage | **Supabase Storage** | Referenciado via `@supabase/supabase-js` |
| Email | **Resend** | Notificaciones de signup |
| IA | Anthropic (Claude), Groq (Whisper v3 turbo) | Requests server-side, claves en env vars |
| Scraping | Apify (HTTP) | Reels de Instagram |

---

## Variables de entorno

Fuente de verdad: [`.env.example`](../.env.example). En produccion se configuran en **Vercel > Settings > Environment Variables**, nunca en `.env.local`.

| Variable | Scope | Obligatoria | Uso |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | si | Base URL para construir OAuth callbacks (prod: `https://<dominio>`) |
| `DATABASE_URL` | secret | si | Prisma runtime, conexion pooled (Supabase `:6543` + `pgbouncer=true`) |
| `DIRECT_URL` | secret | si | Prisma CLI y migraciones, conexion directa (`:5432`) |
| `NEXT_PUBLIC_SUPABASE_URL` | public | si | Endpoint de Supabase para el cliente browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | si | Anon key de Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | si | Bypass de RLS. **Server-only**, nunca al cliente |
| `ANTHROPIC_API_KEY` | secret | si | Claude (analisis, chat Eternity AI, copy) |
| `GROQ_API_KEY` | secret | si | Whisper v3 turbo (transcripcion) |
| `APIFY_API_TOKEN` | secret | si | Scraping de Instagram reels |
| `RESEND_API_KEY` | secret | recomendado | Notificaciones de signup; si falta se silencia sin bloquear |
| `KV_REST_API_URL` | secret | prod | Upstash KV para `lib/utils/ratelimit.ts` |
| `KV_REST_API_TOKEN` | secret | prod | Idem |
| `UPSTASH_REDIS_REST_URL` | secret | prod | Upstash Redis directo para `lib/rate-limit/signup.ts` |
| `UPSTASH_REDIS_REST_TOKEN` | secret | prod | Idem |
| `META_APP_ID` / `META_APP_SECRET` | secret | si (para Instagram) | OAuth Meta |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | secret | si (para YouTube) | OAuth Google |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | secret | si (para TikTok) | OAuth TikTok |
| `E2E_BASE_URL` | CI | tests | URL base para Playwright |

**Deuda tecnica conocida** (documentada en `.env.example`): Upstash se lee con **dos pares de nombres distintos** (`KV_REST_*` vs `UPSTASH_REDIS_*`) desde dos modulos diferentes. Ambos apuntan al mismo backend; se pueden setear con los mismos valores.

**Secretos de CI** (en GitHub > Settings > Secrets and variables > Actions):

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — usados por `deploy.yml`
- Mismo set de env vars de runtime que en Vercel — usados por el job `e2e` de `ci.yml`

---

## Pipeline de deploy

```
  PR abierto  ──▶  Vercel preview URL (integracion nativa GitHub ↔ Vercel)
                   +
                   GitHub Actions:
                   ├── ci.yml       (lint, typecheck, check:brand, check:claude-md, tests + build, E2E en PRs a main)
                   └── guard.yml    (scan de secretos en el diff)

  merge a main  ──▶  ci.yml + guard.yml se re-ejecutan sobre main
                  ──▶  deploy.yml  ──▶  `vercel deploy --prod --yes --token=$VERCEL_TOKEN`
                                        (Vercel corre install, `prisma generate`, `next build`)
```

Notas clave (de `deploy.yml`):

- El workflow usa `vercel deploy --prod` y **deja a Vercel correr el build completo** en su infraestructura. Un intento anterior con `--prebuilt` generaba el Prisma Client en el runner de GitHub pero subia `.next/` sin `node_modules`, causando 500 en todos los API handlers al importar `@prisma/client`. No volver a prebuilt sin resolver esto.
- `concurrency: deploy-vercel-prod` + `cancel-in-progress: false` serializa los deploys de prod.
- `timeout-minutes: 15`.

Notas clave (de `ci.yml`):

- E2E Playwright solo corre en PRs a `main`, pushes a `main`, o `workflow_dispatch` — para mantener feature branches rapidas.
- Coverage threshold: 40% (lines, functions, branches, statements). Configurado en `jest.config.ts`.

---

## Migraciones de base de datos

- **Dev** (local):

  ```bash
  npx prisma migrate dev --name <slug>
  ```

  Crea la carpeta `prisma/migrations/<timestamp>_<slug>/` y aplica a la DB apuntada por `DIRECT_URL`.

- **Prod** (CI/manual antes de un deploy con cambios de schema):

  ```bash
  npx prisma migrate deploy
  ```

  Aplica solo migraciones pendientes, sin re-generar. Hoy este comando **no esta en el pipeline `deploy.yml`** — debe correrse manualmente (ej. `vercel env pull .env.production && npx prisma migrate deploy`) o via Supabase SQL Editor antes del push a `main`. Ver `docs/RUNBOOK.md` > "Migracion prod fallo mid-apply".

- Cada fila de `prisma/migrations/` es un directorio con un `migration.sql` inmutable. No editar migraciones aplicadas.

---

## OAuth callbacks registrados

Las 3 OAuth apps de los proveedores tienen registrada la URL literal de callback. El handler vive en `app/api/social/[platform]/callback/route.ts` (platforms activas: `instagram`, `tiktok`, `youtube`).

| Proveedor | Callback URL de produccion |
|---|---|
| Meta (Instagram) | `https://content-dashboard-seven-omega.vercel.app/api/social/instagram/callback` |
| Google (YouTube) | `https://content-dashboard-seven-omega.vercel.app/api/social/youtube/callback` |
| TikTok | `https://content-dashboard-seven-omega.vercel.app/api/social/tiktok/callback` |

Regla de oro: cualquier cambio en la ruta del callback (renombrar `app/api/social/[platform]/callback/`) obliga a actualizar el panel del proveedor **antes** del deploy, o el login con esa plataforma se rompe.

---

## Rollback

**App (Vercel)**:

1. Vercel dashboard > Project > **Deployments**.
2. Buscar el ultimo deployment estable anterior.
3. Menu `...` > **Promote to Production**.

El rollback es instantaneo (tarda segundos). No toca la DB.

**Base de datos**: Prisma no tiene rollback nativo. Opciones:

- Si la migracion incluye un `rollback.sql` manual en `prisma/migrations/<X>/`, aplicarlo via Supabase SQL Editor.
- Si no hay rollback script, escribir el SQL inverso a mano y ejecutarlo. Marcar la migracion como aplicada/revertida en `_prisma_migrations` segun corresponda.

Ver `docs/RUNBOOK.md` > "Migracion prod fallo mid-apply" para el procedimiento detallado.

---

## Monitoring

- **Vercel Analytics** — trafico y Core Web Vitals, cortesia de la integracion.
- **Vercel > Functions > Logs** — logs de runtime de cada route handler.
- **Supabase Dashboard > Logs** — queries lentas, errores de auth, storage.
- **Upstash Console** — uso de KV/Redis, rate limit keys.

No hay alerting custom (PagerDuty, Sentry, Datadog) configurado a dia de hoy. Para on-call manual, ver `docs/RUNBOOK.md`.

---

## Checklist pre-deploy con cambio de schema

1. `npx prisma migrate dev --name <slug>` en local + commit de la migracion.
2. PR abierto: esperar verde en `ci.yml` + `guard.yml` + preview Vercel.
3. Correr `npx prisma migrate deploy` contra la DB de prod **antes** de mergear.
4. Merge a `main` → `deploy.yml` corre `vercel deploy --prod`.
5. Smoke test en el dominio de prod: login, switch de cliente, una ruta de negocio real (`/youtube` o `/competidores`).

by eternity
