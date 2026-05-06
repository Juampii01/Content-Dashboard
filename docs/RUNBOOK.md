# Runbook — Content Dashboard 2.O

Audiencia: on-call que recibe una alerta o reporte de cliente. Cada seccion es una receta corta con los pasos exactos para diagnosticar y mitigar. Verificado contra el codigo en `main` (`c0a6c80`).

Antes de empezar cualquier intervencion:

- **Nunca** editar `.env.local` de prod — las env vars viven en Vercel > Settings > Environment Variables.
- Tener a mano acceso a: Vercel dashboard, Supabase dashboard, Upstash console, Google Cloud Console, Meta for Developers, TikTok Developers.

---

## `/api/youtube/sync` devuelve 401

**Sintoma**: el usuario hace click en "Sincronizar" en `/youtube` y recibe un 401. La UI puede mostrar un toast "UNAUTHORIZED" o "FORBIDDEN".

**Causa probable**: token de OAuth de Google expirado o revocado, o el refresh token de la `SocialConnection` ya no es valido.

**Pasos**:

1. Revisar logs: Vercel > Functions > Logs > filtrar por `youtube/sync`. Buscar `401` o `invalid_grant`.
2. Confirmar que el usuario tiene una `SocialConnection` para YouTube activa (Prisma Studio o query directa en Supabase).
3. Pedir al usuario que vaya a `/youtube` y haga click en "Reconectar" — eso dispara el flow OAuth de nuevo contra `/api/social/youtube/connect`.
4. Si el reconnect falla: ir a **Google Cloud Console > APIs & Services > Credentials**, verificar:
   - Que `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` de Vercel coinciden con los de la OAuth app activa.
   - Que la callback URL `https://<prod-domain>/api/social/youtube/callback` siga registrada.
   - Que la YouTube Data API siga habilitada en ese proyecto.
5. Si el problema persiste, revocar la `SocialConnection` desde la DB y pedir al usuario un nuevo connect limpio.

---

## Un usuario no puede hacer login

**Sintoma**: el usuario llega a `/login`, ingresa credenciales y queda en loop, ve 500, o queda detenido en `/pending-approval` sin acceso a nada.

**Diagnostico por estado**:

| Sintoma exacto | Estado probable | Accion |
|---|---|---|
| "Invalid login credentials" | password incorrecto o email no confirmado | Supabase > Auth > Users: ver si `email_confirmed_at` es null. Si es null, reenviar email desde el dashboard |
| Login OK pero queda en `/pending-approval` | `Profile.globalRole = 'PENDING'` | Accion normal. SUPER_ADMIN debe ir a `/admin/users` y aprobar (`MEMBER` + crear `ClientAccess`) |
| Login OK pero 500 en cualquier ruta | `Profile` no existe (bootstrap fallo) | Ver Vercel logs del request; generalmente `lib/auth-bootstrap.ts` intento upsert y la DB estaba caida momentaneamente. Pedir reintento; si persiste, crear el `Profile` a mano via Prisma Studio |
| Redirigido a `/login` en cada navegacion | cookie de sesion Supabase expirada y no se refresca | Logout manual + login de nuevo. Si sigue, revisar `middleware.ts` en Vercel logs |

**Query util (Supabase SQL Editor)** para ver el estado de un usuario:

```sql
select p.id, p."globalRole", u.email, u.email_confirmed_at,
       (select count(*) from "ClientAccess" ca where ca."userId" = p.id) as accesses
from "Profile" p
join auth.users u on u.id = p.id
where u.email = '<email>';
```

---

## Rate limit ataca a un cliente legitimo

**Sintoma**: el usuario recibe 429 en una ruta que antes funcionaba (ej. `/api/ai/chat`, `/api/analizador/scrape`, `/api/analizador/analyze`, o `/api/admin/*`).

**Pasos**:

1. Confirmar en Vercel Logs que la respuesta es 429 y el mensaje proviene de `checkRateLimit` / `checkSignupRateLimit` (`lib/utils/ratelimit.ts`).
2. Obtener la **IP de origen** desde los logs de Vercel (cabecera `x-forwarded-for` o `x-real-ip`).
3. Ir a **Upstash Console > Browse** en la base KV/Redis correspondiente. Buscar la key asociada al endpoint e IP (patron: `ratelimit:<scope>:<ip|userId>`).
4. Eliminar la key para resetear el contador, o bajarla a un valor conocido.
5. Si el abuso es real (no un legitimo afectado), considerar bajar la ventana o mover a un rate limit por `userId` en lugar de IP.

**Nota**: en dev, si faltan `KV_REST_*` o `UPSTASH_REDIS_*`, el rate limit esta desactivado silenciosamente — no es el escenario de esta receta.

---

## Migracion prod fallo mid-apply

**Sintoma**: se corrio `npx prisma migrate deploy` apuntando a prod y el comando fallo en medio de aplicar una migracion. La tabla `_prisma_migrations` marca la migracion como `applied_steps_count < steps`.

**Pasos**:

1. **No reintentar ciegamente** `migrate deploy` — Prisma rechaza migraciones parcialmente aplicadas.
2. Abrir el archivo `prisma/migrations/<timestamp>_<slug>/migration.sql` y ver que sentencias alcanzaron a ejecutarse (contrastar con el estado real de las tablas via Supabase > Database > Tables).
3. Decidir: terminar la migracion a mano (aplicar los statements restantes via Supabase SQL Editor) o revertir.
4. **Si terminas a mano**: aplicar los statements restantes uno a uno. Luego:

   ```sql
   update _prisma_migrations
   set applied_steps_count = <total_steps>, finished_at = now(), rolled_back_at = null
   where migration_name = '<timestamp>_<slug>';
   ```

5. **Si reviertes**: aplicar SQL inverso a mano (o desde `prisma/migrations/<X>/rollback.sql` si existiera — hoy el repo **no guarda rollback scripts** como politica). Luego:

   ```sql
   update _prisma_migrations
   set rolled_back_at = now()
   where migration_name = '<timestamp>_<slug>';
   ```

6. Confirmar que la app sigue arriba: smoke test en `/` y en una ruta de negocio.
7. Si el deploy de Vercel quedo colgado por este problema, promover el deploy anterior (Vercel > Deployments > Promote to Production).

---

## La UI muestra datos viejos tras un sync

**Sintoma**: usuario sincroniza YouTube o scrapea un reel, el backend responde 200, pero la UI sigue mostrando los datos anteriores.

**Pasos**:

1. **Hard refresh** en el browser: `Ctrl+Shift+R` (o `Cmd+Shift+R` en macOS). El primer sospechoso es cache de Next.js en el cliente.
2. Si persiste, abrir **Prisma Studio** (`npx prisma studio` contra `DATABASE_URL` de prod, via `vercel env pull`) y verificar:
   - Para YouTube: `AccountSnapshot` mas reciente del `clientId` en cuestion — `take: 1, orderBy: { createdAt: 'desc' }`.
   - Para Instagram/Competidores: `Reel` / `Analysis` creados con `createdAt` posterior al trigger.
3. Si la DB tiene los datos pero la UI no los ve: revisar el hook correspondiente (`hooks/useYouTubeData.ts`, `hooks/useInstagramData.ts`) por cache stale; probablemente requiere revalidar (`router.refresh()` o limpiar SWR/fetch cache).
4. Si la DB NO tiene los datos: revisar Vercel Logs del POST `/api/youtube/sync` o `/api/analizador/scrape` — probablemente el provider externo (YouTube API, Apify) fallo y no se persistio.

---

## Deploy de Vercel fallo

**Sintoma**: push a `main` pero el deploy no aparece en prod o aparece en estado **Error** en Vercel > Deployments.

**Pasos**:

1. Abrir GitHub > Actions > el run de `deploy.yml` correspondiente al commit. Leer los logs del paso `Deploy to production`.
2. Si el log termina con un error de build de Vercel (no del step del runner), abrir ese mismo deploy en Vercel dashboard > **Build Logs**.
3. Causas comunes y fix:

   | Error en build | Causa | Fix |
   |---|---|---|
   | `Environment variable X not defined` | env var falta en Vercel | Vercel > Settings > Environment Variables > agregar > redeploy |
   | `PrismaClientInitializationError` | `DATABASE_URL` invalido, red, o migracion pendiente | Verificar var + correr `prisma migrate deploy` manual |
   | `Module not found: @/...` | path alias roto | Suele ser import con mayusculas mal — fix en codigo, nuevo PR |
   | Timeout en el deploy | Vercel lento o build de 15+ min | Re-disparar `deploy.yml` con `workflow_dispatch` |

4. Si el build de Vercel pasa pero los API handlers tiran 500, revisar Functions > Logs con el error exacto. Caso historico documentado en `deploy.yml`: si alguien vuelve a meter `--prebuilt`, Prisma Client termina sin `node_modules` y todo 500. Solucion: dejar `vercel deploy --prod` sin `--prebuilt`.
5. Rollback inmediato: Vercel > Deployments > promover el ultimo verde.

---

## Supabase down

**Sintoma**: login da 500, lecturas de DB timeout, `/api/me/route.ts` falla.

**Pasos**:

1. Confirmar en **[status.supabase.com](https://status.supabase.com)** que hay incidente abierto en la region del proyecto.
2. **No hay plan B hoy**. La app depende criticamente de Supabase para Auth + Postgres; no existe failover automatico ni read replica alterna.
3. Comunicar al cliente por el canal acordado (incidente externo, ETA la que publique Supabase).
4. Monitorear el status page; una vez resuelto, hacer smoke test: login nuevo, un fetch de negocio (`/youtube`, `/competidores`), un POST con rate limit (`/api/ai/chat`).
5. Si el incidente fue largo y quedo estado inconsistente (ej. media migracion aplicada), aplicar la receta "Migracion prod fallo mid-apply".

---

## Contactos utiles

- **Vercel project**: dashboard de la org donde vive el proyecto.
- **Supabase project**: dashboard del proyecto con la DB de prod.
- **OAuth apps**: Meta Developers, Google Cloud Console, TikTok Developers.
- **Upstash**: console con la KV/Redis de rate limit.

Para escalamiento urgente: Cristian Ortiz (owner tecnico).

by eternity
