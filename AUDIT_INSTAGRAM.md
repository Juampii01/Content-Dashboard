# AUDIT_INSTAGRAM.md — Content Dashboard Instagram Module

**Fecha de auditoría:** 2026-05-26  
**Auditor:** Claude Sonnet 4.6 (read-only, no files modified)  
**Branch auditado:** `claude/silly-mendeleev-e59ca7`

---

## SECCIÓN 1: ESTADO DE LA FASE 1 (CLEANUP PENDIENTE)

### 1.1 Logs [DIAG] temporales

**Resultado:** NINGUNO encontrado.

Se ejecutó `grep -rn "\[DIAG\]"` sobre `/app`, `/lib`, `/components`, `/hooks` con extensiones `.ts` y `.tsx`. El grep devolvió cero resultados. No hay logs temporales `[DIAG]` pendientes de eliminar en el código fuente.

### 1.2 Tokens en plaintext (CRÍTICO)

**`lib/crypto.ts`:** El archivo existe y está completamente implementado.

- `encryptToken(plaintext: string): string` — AES-256-GCM, IV de 12 bytes, formato `v1.<iv>.<tag>.<ct>` (todos base64url). Si `OAUTH_TOKEN_ENCRYPTION_KEY` no está configurada, devuelve plaintext con un log de advertencia (modo legado/graceful).
- `decryptToken(payload: string): string` — Si el payload no comienza con `v1.`, lo retorna sin cambios (backward-compatible con tokens plaintext previos).
- `isEncrypted(payload: string): boolean` — Helper para detectar si ya está cifrado.

**Auditoría de `socialConnection.create()` / `socialConnection.update()` con `accessToken`:**

**CONFORME:** Todos los puntos de escritura de tokens llaman `encryptToken()` antes de persistir:

1. `app/api/social/[platform]/callback/route.ts` líneas 459-470: upsert con `accessToken: encryptToken(tokenResult.accessToken)` y `refreshToken: encryptToken(...)` tanto en `create` como en `update`.
2. `app/api/tiktok/sync/route.ts` línea 111: `accessToken: encryptToken(accessToken)` en el update del token refrescado.
3. Ningún otro punto de escritura de tokens de Instagram encontrado en la base de código.

**ADVERTENCIA — Tokens legacy en DB:**  
La clave `OAUTH_TOKEN_ENCRYPTION_KEY` es **OPTIONAL** según `.env.example` (aparece comentada como `your-32-byte-hex-key-here`). Si esta variable no está configurada en producción, `encryptToken()` devuelve plaintext silenciosamente con un `console.error`. Además, los tokens almacenados ANTES de que esta feature existiera siguen siendo plaintext en la DB.

**SQL para verificar tokens plaintext en producción (ejecutar manualmente en Supabase):**

```sql
SELECT
  COUNT(*) FILTER (WHERE "accessToken" LIKE 'IGAA%' OR "accessToken" LIKE 'EAAB%') AS plaintext_count,
  COUNT(*) AS total
FROM "SocialConnection";
```

Si `plaintext_count > 0`, existen tokens sin cifrar. Un token cifrado tendría la forma `v1.xxxx.yyyy.zzzz`.

---

## SECCIÓN 2: BUGS DE CÁLCULO Y FÓRMULAS

### 2.1 Engagement Rate

**Dónde se calcula:** `app/api/instagram/sync/route.ts` líneas 258-306.

**Fórmula exacta:**
```typescript
// Líneas 260-264: suma TODOS los reels del cliente (no solo los recién sincronizados)
const allReels = await db.userReel.findMany({
  where: { clientId },
  select: { viewsCount: true, likesCount: true, commentsCount: true },
})
const totalInteractions = allReels.reduce((s, r) => s + r.likesCount + r.commentsCount, 0)

// Líneas 278-280:
const engagementRate = snap.followers > 0
  ? (totalInteractions / snap.followers) * 100
  : 0
```

**Por qué puede mostrar 238.1% (matemáticamente imposible):**

La fórmula es `(suma_total_likes_comentarios_de_TODOS_los_reels / seguidores_actuales) * 100`. No es el promedio de engagement por reel — es una tasa acumulada absoluta. Con 64 reels y un promedio de 130 interacciones por reel, eso sería ~8.320 interacciones totales. Dividido entre 357 seguidores = **23.31 veces**, multiplicado por 100 = **2331%**. Un valor de 238.1% con 357 seguidores implicaría ~849 interacciones totales acumuladas (~13 likes+comentarios promedio por reel).

**El bug real:** Esta no es la convención estándar de engagement rate. La convención usual es el promedio del engagement por-reel sobre los últimos N posts (generalmente los últimos 30), no la suma acumulada de toda la historia dividida por los seguidores actuales. Cuantos más reels históricos tenga el cliente, más crece el porcentaje indefinidamente, perdiendo toda utilidad comparativa.

**Impacto:** El valor almacenado en `AccountSnapshot.engagementRate` y expuesto en el TopBar (`/api/me/global-stats`) es inflado e incomparable con benchmarks estándar de la industria (típicamente 1%-5% para cuentas de Instagram).

### 2.2 Total Views (Views=0 con 64 reels)

**Sync route fields solicitados:** `app/api/instagram/sync/route.ts` línea 106:
```
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,shortcode'
```

**Diagnóstico:** El campo `video_views` **NO está en la lista de FIELDS** del endpoint `GET /me/media`. Por tanto, la API no lo devuelve, el schema Zod lo tiene como `optional()` (lib/schemas/instagram.ts línea 24: `video_views: z.number().int().nonnegative().optional()`), y `mediaToUserReel()` en `lib/instagram/transform.ts` línea 47 lo mapea como:
```typescript
viewsCount: m.video_views ?? 0,
```

Si `video_views` no está en FIELDS, siempre será `undefined`, por lo tanto `viewsCount` siempre será `0`.

**Problema secundario de deprecación:** Incluso si se añadiera `video_views` a FIELDS, este campo fue **deprecado por Meta para Reels en julio de 2024**. El campo correcto es `plays` (o `plays_count` en algunas versiones de la API). El campo `video_views` solo aplica a videos de feed estándar (no Reels).

**Root cause del Views=0:** El campo `video_views` nunca se solicita en la llamada a `GET /me/media`.

### 2.3 Mejor día para publicar

**Dónde se calcula:** `app/api/instagram/audience-stats/route.ts` líneas 58-82.

```typescript
reels.forEach((r) => {
  if (r.publishedAt) {
    const d = r.publishedAt.getDay()
    weekdayBuckets[d].totalLikes += r.likesCount
    weekdayBuckets[d].totalComments += r.commentsCount
    weekdayBuckets[d].count++
  }
})
const byWeekday = weekdayBuckets.map((b) => ({
  label: b.label,
  avgEngagement: b.count > 0
    ? Math.round((b.totalLikes + b.totalComments) / b.count)
    : 0,
  count: b.count,
}))
```

**Fallback cuando Views=0:** El cálculo usa likes+comentarios (no views), por lo que funciona correctamente aunque Views=0. El "mejor día" se basa en el promedio de `(likes + comentarios)` por reel publicado ese día de la semana.

**NOTA IMPORTANTE:** `r.publishedAt.getDay()` usa la zona horaria LOCAL del servidor Node.js, no UTC. En un servidor en UTC (como Vercel), esto puede desplazar publicaciones hechas cerca de la medianoche en zonas horarias como Argentina (UTC-3) al día incorrecto.

### 2.4 Dashboard metrics overview

**DashboardTab (`components/tabs/DashboardTab.tsx`):**
- `SEGUIDORES`: `summary?.latestSnapshot?.followers` — viene del último `AccountSnapshot` por fecha descendente (sincronizado desde la API `/me` de Instagram)
- `INTERACCIONES (ME GUSTA)`: suma de `r.likes` sobre todos los reels en memoria, calculado en el cliente como `reels.reduce((s, r) => s + r.likes, 0)` — no viene del TopBar ni de ningún campo de snapshot
- `INTERACCIONES (COMENTARIOS)`: ídem para comentarios
- `MEJOR REEL`: el reel con más likes del array local

**AudienciaTab:**
- `Seguidores`: `latestSnap.followers` del endpoint `audience-stats`
- `Engagement rate`: `latestSnap.engagementRate` (el valor inflado descrito en 2.1)
- `Total views`: `reelStats.totalViews` — suma de `viewsCount` de reels (siempre 0 por el bug descrito en 2.2)

**TopBar (`components/layout/TopBar.tsx`):**
- `VIEWS`: viene de `AccountSnapshot.impressions` vía `/api/me/global-stats`. En Instagram sync, `impressions` se setea igual a `totalViews` (líneas 298/305 de sync/route.ts), que también es 0 por el mismo bug.
- `ENG. RATE`: promedio de `AccountSnapshot.engagementRate` sobre los últimos snapshots, vía `/api/me/global-stats`

---

## SECCIÓN 3: ESTADO DE LAS 4 FEATURES

### 3.1 AUDIENCIA

**Archivo:** `app/api/instagram/audience/route.ts`

**URL de Instagram API utilizada:**
```
GET https://graph.instagram.com/v23.0/me/insights
  ?metric=audience_gender_age,audience_country,audience_city
  &period=lifetime
  &access_token=...

GET https://graph.instagram.com/v23.0/me/insights
  ?metric=follower_count,reach
  &period=day
  &since=<30_days_ago>
  &until=<now>
  &access_token=...
```

**Métricas solicitadas:** `audience_gender_age`, `audience_country`, `audience_city` (lifetime); `follower_count`, `reach` (day, últimos 30 días).

**Por qué puede fallar con 357 seguidores:** La respuesta 422 `INSUFFICIENT_FOLLOWERS` ocurre cuando Instagram devuelve un error con "minimum" o "100 follow" en el mensaje. La API de Insights **requiere 100 seguidores mínimo** para datos demográficos. Con 357 seguidores, el requisito numérico se cumple. Las razones más probables para que falle:

1. **El token no tiene el scope `instagram_manage_insights`** — la mayoría de las apps conectadas usan solo `instagram_business_basic`. Sin este scope, Meta devuelve error code 100 "Unsupported get request".
2. **La cuenta no está categorizadas como Business/Creator** en Instagram — incluso con 357 seguidores, las cuentas personales no pueden acceder a Insights.
3. **El error de código 100 no tiene "minimum"/"100 follow" en el mensaje** — en ese caso el código actual lo clasifica erróneamente como `FETCH_FAILED` en lugar de dar un mensaje descriptivo.

**AudienceSnapshot model:**
```prisma
model AudienceSnapshot {
  id              String   @id @default(cuid())
  clientId        String
  platform        String   @default("instagram")
  date            DateTime
  genderAge       Json     @default("{}")
  country         Json     @default("{}")
  city            Json     @default("{}")
  followerHistory Json     @default("[]")
  reachHistory    Json     @default("[]")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String?
  updatedBy       String?
  @@unique([clientId, platform, date])
  @@index([clientId, platform, date])
}
```

### 3.2 COMENTARIOS

**Archivos auditados:**
- `app/api/instagram/comments/route.ts` — GET: lista y sincroniza comentarios por mediaId
- `app/api/instagram/comments/reply/route.ts` — POST: publica respuesta a un comentario
- `app/api/instagram/comments/[id]/route.ts` — DELETE: oculta un comentario (no borra, marca `hidden=true`)

**Funcionalidades implementadas:**
- Lista/sincronización: SÍ (GET con paginación de hasta 100 comentarios con replies anidadas)
- Responder: SÍ (POST con Zod validation + rate limit 10/min)
- "Eliminar" (ocultar): SÍ (DELETE → llama a Graph API con `POST /{comment-id}?hide=true`)

**NOTA:** No hay endpoint para "unhide" — una vez oculto en la API, no hay forma de reverterlo desde el dashboard. La UI muestra el estado "oculto" pero no permite revertirlo.

**InstagramComment Prisma model:**
```prisma
model InstagramComment {
  id         String   @id @default(cuid())
  clientId   String
  mediaId    String   // Instagram media ID (reel/post)
  commentId  String   // Instagram comment ID
  username   String   @default("")
  text       String
  timestamp  DateTime
  likeCount  Int      @default(0)
  hidden     Boolean  @default(false)
  parentId   String?  // set for replies — points to parent commentId
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@unique([clientId, commentId])
  @@index([clientId, mediaId])
  @@index([clientId, parentId])
}
```

**Estados de UI en ComentariosTab.tsx:** Completamente implementados — loading (skeleton), error, empty state (sin reel seleccionado), empty state (sin comentarios), lista con reels a la izquierda y panel de comentarios a la derecha. Soporta vista de ocultos/visibles y reply form inline.

### 3.3 PUBLICAR

**Archivo:** `app/api/instagram/publish/route.ts`

**Flujo de 2 pasos verificado:**
1. **Crear contenedor** (`POST /v23.0/me/media`) — IMAGE usa `image_url`, REEL usa `media_type: REELS` + `video_url` + `share_to_feed: true`. Se persiste inmediatamente como `PENDING`.
2. **Polling del estado** (`GET /{containerId}?fields=status_code`) — hasta 10 veces con 3 segundos de espera entre cada intento = **máximo 30 segundos** (no incluye tiempo de la primera petición). Para videos puede no ser suficiente.
3. **Publicar** (`POST /v23.0/me/media_publish?creation_id=<id>`)

**Problemas identificados:**
- `export const maxDuration = 60` — correcto para Vercel Pro, pero el timeout de polling (30s de sleep + tiempo de peticiones) podría exceder en edge cases.
- Si el polling alcanza 10 intentos sin `FINISHED`, retorna `PUBLISH_TIMEOUT` y marca el registro como `FAILED`. El contenedor podría terminar procesando después, pero no hay mecanismo de reintento/recovery.
- `mapIGError` (línea 88) está definida pero **nunca se llama** en el código. Dead code.

**PublishedPost Prisma model:**
```prisma
model PublishedPost {
  id           String   @id @default(cuid())
  clientId     String
  createdBy    String?
  containerId  String   @default("")
  postId       String   @default("")
  mediaType    String   @default("IMAGE")
  mediaUrl     String
  caption      String   @default("")
  status       String   @default("PENDING")  // PENDING | PUBLISHED | FAILED
  errorMessage String   @default("")
  publishedAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@index([clientId, createdAt])
  @@index([clientId, status])
}
```

### 3.4 MENSAJES

**Archivos auditados:**
- `app/api/instagram/messages/route.ts` — GET: lista conversaciones (máx 30) o mensajes de una conversación
- `app/api/instagram/messages/sync/route.ts` — POST: sincroniza DMs. Modo cron (todos los clientes) o modo UI (cliente activo)
- `app/api/instagram/messages/send/route.ts` — POST: envía mensaje (valida ventana 24h)

**Vercel cron config (`vercel.json`):**
```json
{
  "crons": [
    {
      "path": "/api/instagram/messages/sync",
      "schedule": "*/5 * * * *"
    }
  ]
}
```
Solo 1 cron, cada 5 minutos, para sync de mensajes. No hay otros crons (no hay sync diario de Instagram, no hay sync de audiencia, etc.).

**Validación de ventana 24h:** Implementada correctamente en `messages/send/route.ts`:
```typescript
const WINDOW_MS = 24 * 60 * 60 * 1000 // 24 horas
// ...
if (!conversation.lastUserMessageAt) {
  return NextResponse.json({ error: 'MESSAGING_WINDOW_CLOSED', ... }, { status: 403 })
}
const windowAge = Date.now() - conversation.lastUserMessageAt.getTime()
if (windowAge > WINDOW_MS) {
  return NextResponse.json({ error: 'MESSAGING_WINDOW_CLOSED', ... }, { status: 403 })
}
```
`lastUserMessageAt` se actualiza en sync cuando se detectan mensajes del usuario (no del negocio).

**IGConversation Prisma model:**
```prisma
model IGConversation {
  id                  String    @id @default(cuid())
  clientId            String
  conversationId      String
  participantId       String    @default("")
  participantUsername String    @default("")
  participantPic      String    @default("")
  lastMessageAt       DateTime?
  lastUserMessageAt   DateTime? // para validación ventana 24h
  unreadCount         Int       @default(0)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  @@unique([clientId, conversationId])
  @@index([clientId, lastMessageAt])
}
```

**IGMessage Prisma model:**
```prisma
model IGMessage {
  id             String   @id @default(cuid())
  clientId       String
  conversationId String
  messageId      String
  fromId         String   @default("")
  fromUsername   String   @default("")
  text           String   @default("")
  isFromBusiness Boolean  @default(false)
  timestamp      DateTime
  createdAt      DateTime @default(now())
  @@unique([clientId, messageId])
  @@index([clientId, conversationId, timestamp])
}
```

---

## SECCIÓN 4: CONFIGURACIÓN E INFRA

### 4.1 Rate limit / Vercel KV

**Grep de "KV env missing":** La cadena exacta `[rate-limit] KV env missing in production` aparece en `lib/utils/ratelimit.ts` línea 86.

**Comportamiento cuando KV no está configurado:**
- En desarrollo: devuelve `null` con `console.warn` (permite todas las requests)
- En producción sin KV: devuelve `null` con `console.error` ("SKIPPING rate limit"), pero **falla OPEN** (permite todas las requests) a menos que `RATE_LIMIT_STRICT=1`
- Con `RATE_LIMIT_STRICT=1`: devuelve `{ success: false }` (bloquea todas las requests con 429)

**Los endpoints de Instagram usan `rl !== null && !rl.success`** como guardia, lo que significa que si KV no está configurado (`null`), el rate limit se salta silenciosamente. Esto es intencional (fail-open) pero significa que los endpoints de Instagram pueden ser llamados sin límite en producción sin KV.

### 4.2 Cron jobs

**`vercel.json` completo:**
```json
{
  "crons": [
    {
      "path": "/api/instagram/messages/sync",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

| Endpoint | Schedule | Propósito |
|---|---|---|
| `/api/instagram/messages/sync` | `*/5 * * * *` (cada 5 min) | Sincroniza DMs de Instagram para todos los clientes con token vigente |

**NOTA:** Este es el ÚNICO cron. No hay crons para sync diario de reels, account snapshot, audiencia, ni para ninguna otra plataforma.

### 4.3 Sync diario

**No hay cron para sync diario de Instagram.** El sync se activa únicamente:
1. Manualmente por el usuario desde la UI (botón "Sincronizar" en `/instagram`)
2. No hay proceso automático para mantener actualizados los snapshots de seguidores, reels o audiencia

Consecuencia: el "EVOLUCIÓN DE SEGUIDORES" en AudienciaTab solo acumula puntos cuando el usuario hace sync manual. Si no sincroniza por varios días, hay huecos en la gráfica.

### 4.4 Variables de entorno

**Vars relevantes a Instagram en `.env.example`:**

| Variable | Estado | Requerida |
|---|---|---|
| `INSTAGRAM_APP_ID` | Presente, required | Sí |
| `INSTAGRAM_APP_SECRET` | Presente, required | Sí |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Presente pero comentada | CRÍTICO en producción |
| `KV_REST_API_URL` | Presente, opcional | Para rate limiting |
| `KV_REST_API_TOKEN` | Presente, opcional | Para rate limiting |
| `CRON_SECRET` | **AUSENTE** | Sí (para cron de mensajes) |
| `INSTAGRAM_REDIRECT_URI` | **AUSENTE** | Opcional pero importante |

**CRÍTICO:** `CRON_SECRET` no está documentada en `.env.example`. Sin esta variable, el endpoint `/api/instagram/messages/sync` acepta requests del cron de Vercel pero también deja de verificar identidad del caller: `const isCron = cronSecret && authHeader === ...` — si `CRON_SECRET` no está seteado, `cronSecret` es `undefined`, y `isCron` es `false`. En ese caso, el cron de Vercel entra por la rama UI (que requiere auth) y falla con 401/403, haciendo que la sincronización de mensajes no funcione.

**IMPORTANTE:** `INSTAGRAM_REDIRECT_URI` tampoco está en `.env.example`. Esta variable pins el redirect_uri exacto registrado en Meta Developer y evita discrepancias entre el URI calculado dinámicamente y el registrado.

---

## SECCIÓN 5: SCHEMA DE BASE DE DATOS

### 5.1 Modelos Prisma relacionados a Instagram

**SocialConnection:**
```prisma
model SocialConnection {
  id           String    @id @default(cuid())
  clientId     String
  createdBy    String?
  updatedBy    String?
  platform     String    // 'instagram' | 'youtube' | 'tiktok' | 'meta-ads'
  accountId    String    // Instagram user ID numérico
  accountName  String    // username (@handle)
  accountPic   String?
  accessToken  String    // AES-256-GCM cifrado (v1.iv.tag.ct) o plaintext legacy
  refreshToken String?
  expiresAt    DateTime?
  scopes       String    @default("")
  connectedAt  DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  @@unique([clientId, platform])
}
```

**UserReel:**
```prisma
model UserReel {
  id             String    @id @default(cuid())
  clientId       String
  createdBy      String?
  updatedBy      String?
  instagramId    String    @unique
  shortcode      String
  url            String
  thumbnailUrl   String?
  videoUrl       String?
  caption        String?
  durationSec    Float?
  viewsCount     Int       @default(0)    // SIEMPRE 0 (bug: no se solicita video_views)
  viewsOrganic   Int       @default(0)   // no poblado
  viewsPaid      Int       @default(0)   // no poblado
  likesCount     Int       @default(0)
  savesCount     Int       @default(0)   // no poblado
  commentsCount  Int       @default(0)
  sharesCount    Int       @default(0)   // no poblado
  reachCount     Int       @default(0)   // no poblado
  impressions    Int       @default(0)   // no poblado
  organicPercent Float     @default(0)   // no poblado
  multiplier     Float     @default(0)   // no poblado
  isAd           Boolean   @default(false)
  isTrialReel    Boolean   @default(false)
  publishedAt    DateTime?
  syncedAt       DateTime  @default(now())
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

**AccountSnapshot:**
```prisma
model AccountSnapshot {
  id             String   @id @default(cuid())
  clientId       String
  createdBy      String?
  updatedBy      String?
  platform       String   @default("instagram")
  date           DateTime
  followers      Int      @default(0)
  following      Int      @default(0)    // no poblado en Instagram sync
  posts          Int      @default(0)
  impressions    Int      @default(0)    // = totalViews (siempre 0 por bug)
  reach          Int      @default(0)   // no poblado
  profileVisits  Int      @default(0)   // no poblado
  newFollowers   Int      @default(0)   // no poblado
  engagementRate Float    @default(0)   // inflado (acumulado, no promedio)
  createdAt      DateTime @default(now())
  @@unique([clientId, platform, date])
}
```

**AudienceSnapshot:** (ver Sección 3.1)

**InstagramComment:** (ver Sección 3.2)

**PublishedPost:** (ver Sección 3.3)

**IGConversation + IGMessage:** (ver Sección 3.4)

### 5.2 Campos sospechosos o redundantes

1. **`UserReel.viewsCount` siempre es 0** — el campo existe en schema pero nunca se popula correctamente porque `video_views` no se solicita en la API. Campos relacionados nunca poblados: `viewsOrganic`, `viewsPaid`, `savesCount`, `sharesCount`, `reachCount`, `impressions`, `organicPercent`, `multiplier`. Esto sugiere que el schema fue diseñado para un scope mayor (con `instagram_manage_insights`) que aún no está activo.

2. **`AccountSnapshot.impressions` = totalViews = 0** — dendencialización que hace que TopBar siempre muestre Views=0. Es una indirección: `impressions` se setea desde `totalViews` que viene de `viewsCount` que siempre es 0.

3. **`UserReel.updatedAt` con `@updatedAt`** pero también `syncedAt` — dos campos de timestamp con propósitos similares. `syncedAt` se fuerza a `new Date()` en cada upsert; `updatedAt` se actualiza automáticamente con Prisma.

4. **`IGConversation.lastMessageAt` vs `lastUserMessageAt`** — dos campos de timestamp similares. `lastMessageAt` se actualiza tanto en sync como al enviar. `lastUserMessageAt` solo se actualiza cuando hay mensajes del usuario (no del negocio). Funcionalmente correctos pero el naming podría ser más claro.

---

## SECCIÓN 6: SEGURIDAD Y BUENAS PRÁCTICAS

### 6.1 Authorization

**Auditoría de `requireActiveClient()` en todos los endpoints de Instagram:**

| Endpoint | Auth usado | Conforme |
|---|---|---|
| `GET /api/instagram/account-summary` | `getUserIdOrNull()` + `getActiveClientId()` | PARCIAL |
| `POST /api/instagram/sync` | `requireActiveClient()` | SÍ |
| `GET /api/instagram/reels` | `requireActiveClient()` | SÍ |
| `GET /api/instagram/audience-stats` | `requireActiveClient()` | SÍ |
| `GET /api/instagram/audience` | `requireActiveClient()` | SÍ |
| `GET /api/instagram/comments` | `requireActiveClient()` | SÍ |
| `POST /api/instagram/comments/reply` | `requireActiveClient()` | SÍ |
| `DELETE /api/instagram/comments/[id]` | `requireActiveClient()` | SÍ |
| `GET /api/instagram/publish` | `requireActiveClient()` | SÍ |
| `POST /api/instagram/publish` | `requireActiveClient()` | SÍ |
| `GET /api/instagram/messages` | `requireActiveClient()` | SÍ |
| `POST /api/instagram/messages/send` | `requireActiveClient()` | SÍ |
| `POST /api/instagram/messages/sync` | `requireActiveClient()` O Bearer token | ESPECIAL |

**Caso especial — `GET /api/instagram/account-summary`:**  
Usa `getUserIdOrNull()` + `getActiveClientId()` en lugar de `requireActiveClient()`. Si el usuario no está autenticado, retorna `{ connected: false }` en lugar de 401. Esto es un diseño intencional (el componente de conexión necesita saber si está conectado sin forzar auth), pero significa que cualquier request anónima puede llamar este endpoint. Los datos expuestos son mínimos (`connected: false`), por lo que el riesgo es bajo.

**Caso especial — `POST /api/instagram/messages/sync` (cron):**
El endpoint acepta requests tanto del cron de Vercel (Bearer CRON_SECRET) como de usuarios autenticados. Si `CRON_SECRET` no está configurada en producción (ver Sección 4.4), el cron never finds the `isCron=true` path y cae al path de usuario, fallando con auth error. Esto es un bug operacional.

### 6.2 Validación de inputs con Zod

| Endpoint | Valida con Zod | Nota |
|---|---|---|
| `POST /api/instagram/comments/reply` | SÍ — `BodySchema` ({commentId, message}) | Completo |
| `DELETE /api/instagram/comments/[id]` | N/A — no tiene body, id en params | OK |
| `POST /api/instagram/publish` | SÍ — `BodySchema` ({mediaType, mediaUrl, caption}) | Completo |
| `POST /api/instagram/messages/send` | SÍ — `BodySchema` ({conversationId, text}) | Completo |
| `GET /api/instagram/comments` | query param `mediaId` validado con `if (!mediaId)` | Sin Zod pero OK |
| `GET /api/instagram/messages` | query param `conversationId` no validado | OK (cualquier string es válido) |
| `POST /api/instagram/sync` | Sin body | N/A |
| `POST /api/instagram/messages/sync` | Sin body del usuario | N/A |

**Resultado:** Todos los endpoints con body usan Zod correctamente.

### 6.3 RLS de Supabase

El estado de RLS no es determinable desde el código — debe verificarse manualmente en el dashboard de Supabase.

**FLAG para verificación manual:** Las tablas `UserReel`, `AccountSnapshot`, `AudienceSnapshot`, `InstagramComment`, `PublishedPost`, `IGConversation`, `IGMessage`, `SocialConnection` deben tener políticas RLS que restrinjan el acceso por `clientId`. Dado que la aplicación usa un service role key (`SUPABASE_SERVICE_ROLE_KEY`) vía Prisma, RLS en PostgreSQL no aplica a queries de Prisma. La seguridad a nivel de tenant depende completamente de los filtros `WHERE clientId = ?` en el código. Una consulta sin `clientId` en el WHERE sería una vulnerabilidad de cross-tenant data leak.

### 6.4 Logs sensibles

**Búsqueda de console.log/error/warn que puedan exponer tokens:**

Ningún log expone valores de access_token directamente. Los logs relacionados a tokens solo loguean metadata (status codes, campos de error de la API, `expires_in`):

- `app/api/social/[platform]/callback/route.ts` línea 93: `console.log('[instagram/callback] long-lived token obtained, expires_in:', longData.expires_in)` — seguro, solo loguea `expires_in`.
- `app/api/social/[platform]/callback/route.ts` línea 57: loguea `shortRes.status` y `shortRawText.slice(0, 400)` del cuerpo de error del token exchange — este es el cuerpo de error de Meta, que en error contiene el mensaje pero NO el token.

**ADVERTENCIA potencial:** `shortRawText.slice(0, 400)` en el callback de Instagram podría en teoría loguear hasta 400 chars del body de error. Si Meta alguna vez incluyera el código en el cuerpo del error, esto sería un leak. En la práctica, los cuerpos de error de Meta son del tipo `{ "error_message": "...", "error_type": "..." }` sin el token.

---

## SECCIÓN 7: INSTAGRAM API — PROBLEMAS DETECTADOS

### 7.1 Versiones de API

Todas las URLs en el código usan la constante `GRAPH_VERSION = 'v23.0'`. La única excepción es en el callback donde el long-lived token exchange usa la URL base sin versión:

| Archivo | URL | Versión |
|---|---|---|
| `callback/route.ts` | `https://graph.instagram.com/access_token` | Sin versión (correcto — este endpoint no usa versión) |
| `callback/route.ts` | `https://graph.instagram.com/v23.0/me?fields=...` | v23.0 |
| `sync/route.ts` | `https://graph.instagram.com/v23.0/me/media` | v23.0 |
| `sync/route.ts` | `https://graph.instagram.com/v23.0/me?fields=...` | v23.0 |
| `audience/route.ts` | `https://graph.instagram.com/v23.0/me/insights` | v23.0 |
| `comments/route.ts` | `https://graph.instagram.com/v23.0/{mediaId}/comments` | v23.0 |
| `comments/reply/route.ts` | `https://graph.instagram.com/v23.0/{commentId}/replies` | v23.0 |
| `comments/[id]/route.ts` | `https://graph.instagram.com/v23.0/{commentId}` | v23.0 |
| `publish/route.ts` | `https://graph.instagram.com/v23.0/me/media` | v23.0 |
| `messages/sync/route.ts` | `https://graph.instagram.com/v23.0/{accountId}/conversations` | v23.0 |
| `messages/send/route.ts` | `https://graph.instagram.com/v23.0/me/messages` | v23.0 |

**Conclusión:** Versiones consistentes. Todas usan `v23.0`.

**NOTA:** El comentario en `sync/route.ts` línea 37 dice "Do NOT use `/v21.0/me/media`" pero usa `v23.0/me/media`. La nota es un vestigio histórico del debugging. No hay inconsistencia real.

### 7.2 Endpoints deprecados

**`video_views` en la lista FIELDS del sync:**  
El campo `video_views` está en el schema Zod (`lib/schemas/instagram.ts` línea 24) pero **NO en la lista FIELDS del GET /me/media** en `sync/route.ts` línea 106. Aunque no cause un error (la API simplemente lo ignora al no estar en FIELDS), el campo `video_views` fue deprecado por Meta para Reels en julio de 2024. El campo correcto es `plays`.

**`follower_count` en `/me/insights`:**  
El endpoint de audiencia solicita `follower_count` como métrica de insights diarios. En API v17+ este campo fue reemplazado por `follower_demographics` para datos de audiencia. El comportamiento con v23.0 podría ser inconsistente o retornar 0.

**Campos nunca solicitados pero con columnas en el schema:**  
Los campos `impressions`, `reach`, `saves_count`, `shares_count` existen en `UserReel` pero nunca son solicitados en la sincronización. Requieren el scope `instagram_manage_insights` (permisos avanzados de Meta que necesitan App Review).

### 7.3 Manejo de errores

**Cobertura de códigos de error de Instagram Graph API:**

| Código | Descripción | sync | audience | comments | publish | messages |
|---|---|---|---|---|---|---|
| 190 | Token inválido/expirado | SÍ | SÍ | SÍ | SÍ | SÍ |
| 4 | App call limit | SÍ | SÍ | SÍ | SÍ | NO |
| 17 | User request limit | SÍ | SÍ | SÍ | SÍ | NO |
| 32 | App rate limit | SÍ | SÍ | SÍ | SÍ | NO |
| 100 | Unsupported request / invalid param | Parcial | Parcial | Parcial | NO | NO |
| subcode 2446079 | IG rate limit específico | SÍ | SÍ | SÍ | SÍ | NO |

**`messages/sync/route.ts`** no maneja códigos de error específicos en `syncClient()` — solo loguea `console.warn` y devuelve `0` en caso de fallo. Esto significa que si un token expira, no se marca el `expiresAt` automáticamente para ese cliente desde el cron.

---

## SECCIÓN 8: HALLAZGOS ADICIONALES

### 8.1 `mapIGError` — Dead code en publish/route.ts

La función `mapIGError` (línea 88 de `publish/route.ts`) está definida pero **nunca se llama**. Todo el manejo de errores en la misma ruta se hace inline con bloques `if (code === 190)...`. Esta función es dead code y debería eliminarse para evitar confusión.

### 8.2 `void userId` en messages/sync

En `messages/sync/route.ts` línea 189: `void userId` — el userId se obtiene de `requireActiveClient()` pero no se usa. La declaración `void userId` suprime el warning del compilador pero es un code smell. El `userId` no es necesario en el path UI de este endpoint.

### 8.3 Timezone bug en weekday analysis

`app/api/instagram/audience-stats/route.ts` línea 68:
```typescript
const d = r.publishedAt.getDay()
```
`getDay()` usa la timezone local del servidor Node.js. En Vercel (UTC), un reel publicado el lunes a las 21hs en Argentina (UTC-3) tiene `publishedAt` como martes 00:00 UTC, y por tanto se cuenta como martes en lugar de lunes. No es crítico pero afecta la precisión del "mejor día para publicar".

### 8.4 Inconsistencia en `account-summary` vs `audience-stats`

- `/api/instagram/account-summary` devuelve `reelCount` (total de UserReels del cliente) pero no devuelve `engagementRate` ni `viewsCount`
- `/api/instagram/audience-stats` devuelve el desglose completo pero requiere auth y tiene más lógica

El componente `DashboardTab` usa el contexto (`useInstagramDataContext`) que carga `/account-summary` + `/reels`, mientras `AudienciaTab` carga adicionalmente `/audience-stats`. Si un usuario solo visita el tab Dashboard, los datos de engagement rate en AudienciaTab pueden no estar frescos.

### 8.5 `CRON_SECRET` ausente en `.env.example`

Documentado en Sección 4.4. Si `CRON_SECRET` no está configurada en producción, los crons de Vercel para sincronización de mensajes **fallan silenciosamente** — no llegan a sincronizar datos y no generan alertas visibles. El efecto es que la bandeja de mensajes deja de actualizarse hasta que el usuario hace sync manual.

### 8.6 Scope de permisos no verificado en runtime

Ningún endpoint verifica el `scopes` almacenado en `SocialConnection` antes de hacer una llamada a la API. Si un token fue conectado con scopes insuficientes (e.g., sin `instagram_manage_insights`), el error solo se detecta cuando la llamada a Meta falla. Sería más eficiente verificar el scope antes de la llamada y retornar un error descriptivo.

### 8.7 Sin token renewal para Instagram

Los tokens de Instagram long-lived duran 60 días pero necesitan ser refrescados manualmente. No hay proceso automático de renovación. Si el token expira, el único recovery es reconectar la cuenta desde la UI. A diferencia de TikTok (que tiene refresh_token y auto-renewal en `tiktok/sync/route.ts`), Instagram no tiene `refreshToken` ni lógica de renovación.

---

## SECCIÓN 9: RESUMEN EJECUTIVO Y PRIORIZACIÓN

### 9.1 Tabla de hallazgos

| # | Severidad | Área | Problema | Archivo | Esfuerzo |
|---|---|---|---|---|---|
| 1 | CRÍTICO | API / Views | `video_views` nunca solicitado en FIELDS → viewsCount=0 para todos los reels | `app/api/instagram/sync/route.ts` línea 106 | Bajo (1 línea) |
| 2 | CRÍTICO | Seguridad | `OAUTH_TOKEN_ENCRYPTION_KEY` marcada como opcional en `.env.example` → tokens plaintext en prod si no está configurada | `.env.example`, `lib/crypto.ts` | Bajo (config) |
| 3 | ALTO | Cron / Infra | `CRON_SECRET` ausente en `.env.example` → sync de mensajes falla silenciosamente en prod | `.env.example`, `app/api/instagram/messages/sync/route.ts` | Bajo (config) |
| 4 | ALTO | Fórmula | Engagement rate acumulado (no promedio por reel) → valores imposibles como 238% | `app/api/instagram/sync/route.ts` líneas 260-280 | Medio (requiere decisión de fórmula + migración de datos históricos) |
| 5 | ALTO | API deprecada | `video_views` deprecado en julio 2024 para Reels; debe usarse `plays` o endpoint de insights | `lib/schemas/instagram.ts`, `lib/instagram/transform.ts` | Medio (requiere validar con Meta App Review scope) |
| 6 | MEDIO | Auth | `account-summary` usa `getUserIdOrNull()` en vez de `requireActiveClient()` → endpoint accesible sin auth | `app/api/instagram/account-summary/route.ts` | Bajo |
| 7 | MEDIO | Token lifecycle | No hay renovación automática de tokens de Instagram (expiran en 60 días sin aviso) | Ningún archivo; feature ausente | Alto |
| 8 | MEDIO | Cron | Sin sync diario automático de reels/snapshots → gráficas de evolución tienen huecos | `vercel.json` | Medio (añadir cron + endpoint) |
| 9 | MEDIO | Config | `INSTAGRAM_REDIRECT_URI` no documentado en `.env.example` → callbacks pueden fallar si App URL no está configurada | `.env.example` | Bajo |
| 10 | BAJO | Dead code | `mapIGError()` en `publish/route.ts` definida pero nunca llamada | `app/api/instagram/publish/route.ts` línea 88 | Bajo |
| 11 | BAJO | Correctness | Timezone bug en weekday analysis (`getDay()` en UTC afecta "mejor día") | `app/api/instagram/audience-stats/route.ts` línea 68 | Bajo |
| 12 | BAJO | Error handling | `messages/sync` no maneja códigos 4/17/32 ni marca token expirado en el cron path | `app/api/instagram/messages/sync/route.ts` función `syncClient` | Bajo |
| 13 | BAJO | Publish | Timeout de contenedor (30s) puede ser insuficiente para videos largos; sin mecanismo de recovery | `app/api/instagram/publish/route.ts` | Medio |
| 14 | INFO | DB schema | 8+ campos en `UserReel` nunca se poblan (savesCount, sharesCount, reachCount, impressions, etc.) | `prisma/schema.prisma` | Requiere Meta App Review |
| 15 | INFO | RLS | Estado de Row Level Security en Supabase no verificable desde código | Supabase dashboard | Manual |

### 9.2 Orden recomendado de fixes

**Prioridad 1 — Quick wins que desbloquean funcionalidades (1-2 horas cada uno):**

1. **Fix #1 (Views=0):** Añadir `plays` o `video_views` a la lista FIELDS en `sync/route.ts` y actualizar el schema Zod. Nota: `video_views` está deprecated para Reels, verificar si `plays` está disponible con el scope actual. Si no, documentar que views requiere `instagram_manage_insights`.

2. **Fix #3 (CRON_SECRET):** Añadir `CRON_SECRET` a `.env.example` con comentario claro. Verificar que está configurada en Vercel dashboard de producción.

3. **Fix #2 (encryption key):** Cambiar la línea de `OAUTH_TOKEN_ENCRYPTION_KEY` en `.env.example` de "opcional" a "REQUERIDA en producción". Ejecutar el SQL de diagnóstico en prod para verificar si hay tokens plaintext.

**Prioridad 2 — Fixes de correctness (1-4 horas):**

4. **Fix #4 (engagement rate):** Cambiar la fórmula a promedio de engagement por reel sobre los últimos 30 posts: `avg(likesCount + commentsCount) / followers * 100`. Requiere decisión sobre qué hacer con datos históricos ya almacenados.

5. **Fix #9 (INSTAGRAM_REDIRECT_URI):** Documentar en `.env.example`.

6. **Fix #11 (timezone):** Cambiar `getDay()` a un método UTC-aware.

7. **Fix #12 (error handling en messages/sync):** Añadir manejo de error codes 190/4/17/32 en `syncClient()`.

**Prioridad 3 — Features y mejoras (4+ horas cada una):**

8. **Fix #8 (sync diario):** Añadir cron `0 6 * * *` para sync automático diario de Instagram reels + account snapshot.

9. **Fix #7 (token renewal):** Implementar renovación automática del token de Instagram (la API de Instagram permite renovación con el token actual si está dentro de los 60 días).

10. **Fix #13 (publish timeout):** Implementar un sistema de polling asíncrono o aumentar `MAX_POLLS` a 20 con backoff exponencial.

**Puede hacerse en paralelo con cualquiera de los anteriores:**
- Fix #10 (dead code `mapIGError`)
- Fix #6 (considerar añadir auth más estricto a `account-summary` si se decide exponer más datos ahí)
- Fix #15 (verificar RLS en Supabase dashboard)

**Requiere decisión de producto / App Review:**
- Fix #5 y Fix #14: Acceder a campos como `plays`, `reach`, `saves`, `shares` requiere el scope `instagram_manage_insights`, que debe pasar por Meta App Review (proceso de semanas). Hasta que se obtenga, el schema de `UserReel` tiene campos que nunca se poblarán.
