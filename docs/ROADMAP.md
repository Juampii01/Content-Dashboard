# Roadmap — Content Dashboard 2.O

Audiencia: product owner / tech lead que toma el proyecto tras el handoff. Derivado del `audit/Plan definitivo.md` (versiones locales del equipo original) y del historial real de commits/PRs en `main`.

Documento vivo: actualizar cuando se cierre un sprint o se reevalue prioridad. Verificado contra `main` en `74354a3` (2026-04-22).

---

## Estado actual al handoff (2026-04-22)

**Scorecard interno del plan original**: 5.2 → 8.2 (de 10) tras los sprints 1–4 parciales.

| Sprint | Estado | Notas |
|---|---|---|
| Sprint 1 — Fundacion | 100% | Env coherence, brand tokens, anti-drift CI, CLAUDE.md verificado |
| Sprint 2 — Core fixes | 100% | `/ventas` + `/meta-ads` eliminados, signup redirect, Eternity AI persiste tokens/costo, YouTube wire-up real |
| Sprint 3 — Security + UI hardening | 100% | RL fail-closed en prod, httpOnly cookies, Zod en YouTube, 11 rutas con `requireActiveClient`, error.tsx en 9 rutas, skeletons |
| Sprint 4 — Performance + refactors | ~70% | AuthProvider real, `Promise.all*` en OAuth + sync IG/YT, AccountSnapshot discriminador, RichEditor/CalendarioTab/SettingsModal split, useContentItems dedup. Falta: resto de splits mayores a 500 LOC, `lib/crypto.ts` wiring a SocialConnection |
| Sprint 5 — API hygiene + avatar storage | 0% | Pendiente: ver "Siguiente sprint" abajo |
| Sprint 6 — Calidad de entrega | parcial | Docs handoff listos (#43), guard workflow listo (#39). Falta E2E auth fixture, Lighthouse baseline, a11y audit |

Honestidad explicita: el sprint 4 **no** se cerro 100%. Hay refactors y el wiring de `lib/crypto.ts` que quedaron fuera por tiempo. Documentados como "pendiente critico pre-prod" mas abajo.

---

## Pendiente critico pre-prod (bloqueantes suaves)

Cosas que hoy funcionan pero cuyo comportamiento **no es el que se quiere en produccion sostenida**:

### 1. Provisionar Vercel KV para rate limit real

- Estado actual: `lib/utils/ratelimit.ts` hace **fail-OPEN** cuando `KV_REST_API_URL` / `KV_REST_API_TOKEN` faltan o el modulo opcional no carga (ver PR #46).
- Esto es seguro (no rompe `/admin/*` por 429 infinito) pero implica que **hoy no hay enforcement real** de rate limit en prod.
- Accion: crear un store KV en Vercel dashboard, copiar las vars a Env Variables (prod + preview), redeploy. Opcional: setear `RATE_LIMIT_STRICT=1` para volver a fail-closed si KV caido.

### 2. `OAUTH_TOKEN_ENCRYPTION_KEY` + wiring de `lib/crypto.ts` a `SocialConnection`

- Helper AES-256-GCM ya existe (PR #37, tests round-trip + tamper + legacy-passthrough).
- **Wiring pendiente**: `SocialConnection.accessToken` / `refreshToken` hoy se guardan en texto plano. El helper esta listo pero no esta cableado al flujo OAuth (`app/api/social/[platform]/callback/route.ts`).
- Accion: generar `OAUTH_TOKEN_ENCRYPTION_KEY` (32 bytes base64url), agregar a Vercel env vars, usar `encrypt()` al persistir y `decrypt()` al leer. La logica legacy-passthrough del helper soporta datos existentes sin cifrar.

### 3. E2E fixture de auth

- 3 tests E2E quarantined en `e2e/*.test.ts` (PR #36) porque requieren usuario autenticado y no hay fixture para eso:
  - `e2e/create-reel-calendar.test.ts`
  - `e2e/drag-calendar.test.ts`
  - `e2e/generar-copy.test.ts`
- Accion: crear una fixture Playwright que:
  1. Haga sign-in programatico contra Supabase Auth con un usuario de test.
  2. Setee la cookie `activeClientId` al `Client` de test.
  3. Exporte un `authenticated` test fixture reutilizable.
- Una vez exista, des-cuarentenar los 3 tests.

---

## Sprint 5 — API hygiene + backlog (proximo sprint sugerido)

Acumulacion del plan original (findings `api-M/L`) + items de UI que requieren backend:

- **19 findings api-M/L** del audit consolidado (status codes inconsistentes, validacion Zod faltante en algunos handlers, error shapes no uniformes). Accion: barrer `app/api/**` con checklist.
- **Avatar → Supabase Storage**: hoy son data-URL en `Profile.avatarUrl`. Migrar a bucket `avatars` con RLS basado en `auth.uid()`. Al cerrar, expandir `docs/BACKUP.md`.
- **Cron job para sync**: hoy `/api/youtube/sync` y `/api/analizador/scrape` son sync-on-demand. Con **Vercel Cron** (no cron interno) programar sync nocturno por `Client` con `SocialConnection` activa.
- **`/admin/logs` UI para audit log**: hoy no existe audit log estructurado (ver backlog mediano plazo). Este item depende del primero.
- **Resend domain verification**: mover `RESEND_API_KEY` a un dominio verificado para evitar deliverability pobre desde el sandbox.

---

## Sprint 6 restante — calidad de entrega

Items de QA y observabilidad que no bloquean pero elevan el bar:

- **E2E smoke real**: una vez hecha la fixture de auth, crear un smoke test que cubra login → switch client → crear un content item → sync YouTube.
- **Lighthouse baseline >85 mobile**: medir hoy en preview de Vercel, identificar issues (probablemente LCP en `/instagram` por charts), documentar score actual y target.
- **A11y audit**: barrer con `@axe-core/playwright` o similar. Foco en contraste (usar `check:brand` como red de soporte), roles ARIA en componentes custom de Base UI, y keyboard navigation en DnD kanban.

---

## Mediano plazo (backlog inferido del plan + schema)

- **`IncomeRecord.amount` Float → Decimal**: el modelo existe en `prisma/schema.prisma` (linea ~517) con `amount Float`. Hoy el modulo `/ventas` esta eliminado (commit `5cc7bbe`) por decision de producto, pero si se reactiva, migrar `Float → Decimal(12, 2)` antes de insertar datos reales. Float tiene error de redondeo inaceptable para dinero.
- **Audit log schema + instrumentacion**: no existe modelo `AuditLog` en `schema.prisma`. Crear tabla `AuditLog(id, userId, clientId, action, targetType, targetId, metadata Json, createdAt)` y poblar desde rutas sensibles (`/api/admin/*`, cambios de rol, borrados). Pre-requisito de `/admin/logs` UI del Sprint 5.
- **CI Node 22 bump**: hoy Node 20.x. Vercel ya soporta Node 22; alinear cuando Next 16 lo certifique (`next.config.ts` y Vercel project settings).
- **File splits: revisar si aparecen nuevos > 500 LOC**: `MH-16/17` splits ya aplicados (RichEditor, CalendarioTab, SettingsModal). Correr periodicamente un `find components/ -name "*.tsx" -exec wc -l {} + | sort -n | tail -10` y dividir proactivamente.

---

## Largo plazo / vision

Cosas que hoy **no** son urgentes pero conviene tener en el horizonte:

- **Multi-region**: Vercel **Fluid Compute** ya lo permite. Hoy la app corre en la region default del proyecto. Ver costo adicional y latencia a Supabase (la DB no es multi-region) antes de activar.
- **i18n**: hoy todo texto UI esta en espanol. Para entrar a mercados anglo, introducir `next-intl` o similar. No bloquea el proyecto pero cambia cada componente que renderiza strings literales.
- **Meta App Review para `instagram_manage_insights`**: es el unico camino "oficial" para obtener reach/impressions reales de Instagram. Hoy la estrategia decidida por producto es **NO** pasar por App Review y usar scraping (ver decisiones no-objetivo abajo). Si cambia la estrategia, este unlock habilita metricas que hoy no se tienen.

---

## Decisiones explicitas no-objetivo

Cosas que ya fueron evaluadas y decididas **no hacer** — documentarlas explicitamente evita que un PM futuro las reabra sin contexto:

- **No App Review de Meta / Google / TikTok para permisos avanzados**. La estrategia persistente del proyecto es **scraping-first via Apify**. Menos friccion legal, menos superficie de revocacion por cambios de policy. Los OAuth connects actuales usan solo scopes basicos que no requieren review.
- **No cron interno**. Si/cuando se necesite scheduling, usar **Vercel Cron Jobs**. Nada de `setInterval` en boot de Next, ni un worker Node separado.
- **No auto-deploy de migraciones desde CI**. `npx prisma migrate deploy` se corre **manual** antes del merge a main — intencional, evita migraciones destructivas ejecutadas por accidente en la pipeline.
- **No logs en `console.log` como observabilidad de primera**. Vercel Functions > Logs existe, pero si el proyecto crece, evaluar Sentry/Datadog. No se adopta hoy por costo-beneficio al tamano actual.
- **No `/ventas` y no `/meta-ads`**. Ambas rutas fueron eliminadas intencionalmente (commit `5cc7bbe`): `/ventas` era un mockup sin CRUD real, `/meta-ads` duplicaba `/ads`. No re-agregar sin diseno explicito.

---

## Como actualizar este documento

- Al cerrar un sprint: marcar su fila en el scorecard y mover items pendientes al siguiente sprint o al backlog.
- Al tomar una decision "no-objetivo": agregarla al listado de abajo — el valor de este doc crece con cada decision que evita.
- Al encontrar un bloqueante nuevo: agregarlo a "pendiente critico pre-prod" si aplica, con el PR o commit de referencia.

---

by eternity
