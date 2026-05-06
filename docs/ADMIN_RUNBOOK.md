# Admin Runbook — Content Dashboard 2.O

Audiencia: **super admin** operativo del workspace (rol global `SUPER_ADMIN`). Recetas click-by-click para operar el sistema. Para diagnóstico de incidentes técnicos, ver [`docs/RUNBOOK.md`](./RUNBOOK.md) — este documento lo complementa, no lo duplica.

Pre-requisito: tener una cuenta con `Profile.globalRole = 'SUPER_ADMIN'`. Si aún no lo tienes, ver la sección final **"Acceso de emergencia"**.

---

## Aprobar un signup pendiente

Cuando un usuario nuevo se registra desde `/login`, queda en estado `PENDING` y es redirigido automáticamente a `/pending-approval`. Solo un super admin puede promoverlo.

1. Login como SUPER_ADMIN.
2. Ir a **`/admin/users`** (también accesible desde el sidebar, grupo ADMIN).
3. Filtrar la tabla por **"Pendientes"**.
4. Identificar al usuario por email.
5. Click en el botón **"Aprobar"** en la fila del usuario.
6. La fila cambia de `PENDING` a `MEMBER`.

Efecto: la próxima vez que el usuario haga login, ya no será redirigido a `/pending-approval`. Sin embargo, **aún no tiene acceso a ningún cliente** — necesita al menos una concesión vía el modal "Acceso" (ver siguiente sección).

---

## Conceder acceso a un cliente

Un MEMBER solo puede ver los clientes listados en su `ClientAccess`.

1. `/admin/users`.
2. Localizar la fila del usuario.
3. Click en el botón **"Acceso"**.
4. Se abre un modal con checkboxes por cada cliente existente.
5. Seleccionar los clientes a los que se le da acceso.
6. Click en **Guardar**.

El usuario puede ahora hacer `activeClientId` switch a cualquiera de esos clientes vía el `ClientSwitcher` en el TopBar.

---

## Revocar acceso

1. `/admin/users` → botón **"Acceso"** en la fila del usuario.
2. En el modal, **desmarcar** el checkbox del cliente a revocar.
3. Guardar.

El usuario pierde acceso inmediatamente; si tenía ese `clientId` como activo en su cookie, la próxima request a una ruta scoped devolverá 403 `NO_CLIENT_ACCESS` y el `ClientSwitcher` lo forzará a elegir otro.

---

## Promover a SUPER_ADMIN

1. `/admin/users`.
2. Fila del usuario → dropdown **"ROL"** (columna "Rol").
3. Seleccionar **SUPER_ADMIN**.
4. Confirmar el cambio.

**Cuidado**: un SUPER_ADMIN puede ver y editar **todos los clientes**, crear/borrar tenants, y conceder/revocar accesos. Solo promueve a gente que debería tener ese poder.

Nota de seguridad: el sistema bloquea demover al **último** SUPER_ADMIN (error 400 "Cannot demote the last SUPER_ADMIN"). Antes de demoverte, asegúrate de que haya al menos otro super admin vivo.

---

## Crear un nuevo cliente (tenant)

Cada "cliente" es un tenant aislado: contenido, reels, snapshots, tareas, ideas, guiones, bases — todo scoped por `clientId`.

1. `/admin/clients`.
2. Click en **"+ Nuevo cliente"**.
3. Rellenar:
   - **Nombre** (visible en la UI, máx 120 caracteres)
   - **Slug** (opcional — se autogenera del nombre). Formato: `lowercase-con-guiones`
4. Guardar.

El cliente aparece en el listado con `accessCount: 0`. A partir de aquí, concede acceso a uno o más usuarios (ver "Conceder acceso").

---

## Editar un cliente

1. `/admin/clients`.
2. Icono **editar** (lápiz) en la fila del cliente.
3. Modificar **nombre** y/o **slug**.
4. Guardar.

**Cuidado al cambiar el slug**: el slug puede aparecer en permalinks, bookmarks, integraciones externas y URLs internas — cambiarlo rompe cualquier referencia que lo use literal. Evita cambiar slugs de clientes en producción salvo razón fuerte.

Error esperado: **409 "Slug already exists"** si el slug colisiona con otro cliente.

---

## Eliminar un cliente

1. `/admin/clients`.
2. Icono **trash** en la fila del cliente.
3. Confirmar.

**Esto es irreversible**. La eliminación hace cascade delete de **toda la data del tenant** vía las relaciones de Prisma:

- `SocialConnection` (conexiones OAuth de Instagram/TikTok/YouTube)
- `AccountSnapshot`, `YouTubeVideo`, `UserReel`, `Story`, `IncomeRecord`
- `Competitor`, `Reel`, `Transcription`, `Analysis`, `ChatMessage`, `ScrapeJob`
- `Conversation`, `AIMessage`
- `ContentPiece`, `ContentTemplate`, `Task`, `Idea`, `GuionTab`, `GuionItem`
- `ICPProfile`, `BusinessBase`
- Todas las filas `ClientAccess` que apuntaban a este cliente

**No hay undo** dentro de la aplicación. La única recuperación es un backup de Supabase (point-in-time-restore del proyecto Postgres) — si el proyecto no tiene PITR habilitado, la data está perdida.

Antes de borrar un cliente real, considera exportar su data vía Prisma Studio o un script ad-hoc.

---

## Conectar una cuenta social (Instagram / YouTube / TikTok) para un cliente

Las conexiones sociales están **asociadas al cliente activo**, no al usuario. Una sola conexión `SocialConnection` por `(clientId, platform)`.

1. En el TopBar, abrir el **ClientSwitcher** y elegir el cliente destino.
2. Navegar a `/instagram`, `/youtube` o (cuando exista en UI) `/tiktok`.
3. Click en el botón **"Conectar"** del banner de estado.
4. Serás redirigido al panel OAuth del provider (Meta / Google / TikTok).
5. Aceptar permisos.
6. El provider te redirige de vuelta a `/api/social/<platform>/callback`, que upsertea la `SocialConnection` y te lleva a la página original.

A partir de aquí:

- **Instagram**: `/api/instagram/sync` (botón "Sincronizar" en la UI) puede traer media y crear snapshots.
- **YouTube**: `/api/youtube/sync` (botón "Sincronizar") trae stats del canal + últimos 25 videos.

Si el token del provider expira, la UI debería mostrar un banner "Reconectar" y el sync devolverá `TOKEN_EXPIRED`. Para procedimiento, ver [`docs/RUNBOOK.md`](./RUNBOOK.md) § "`/api/youtube/sync` devuelve 401".

---

## Desconectar una cuenta social

1. Switch al cliente cuyo enlace quieres borrar.
2. Navegar a la página de la plataforma (`/instagram`, `/youtube`).
3. Click en el botón **"Desconectar"** dentro del banner de conexión (la etiqueta exacta puede variar por plataforma — si no lo encuentras, verifica en el código `components/.../ConnectBanner` o similar).
4. Confirmar.

El endpoint `DELETE /api/social/<platform>/disconnect` es **idempotente**: si la fila no existía, también responde `success: true`. No borra reels/snapshots ya sincronizados — esa data queda histórica en la DB.

---

## "Un usuario reporta sesión expirada"

Si un usuario ve un mensaje de sesión expirada o es redirigido a `/login` constantemente:

1. Pídele que **cierre sesión** (UserMenu → Log out) y vuelva a entrar limpio.
2. Si persiste, pídele que pruebe en **ventana privada / otro browser** para descartar cookies corruptas.
3. Si sigue fallando:
   - Revisar **Vercel → Functions → Logs**, filtrar por `/api/me` o el pathname que está fallando. Busca errores de cookie o de Supabase.
   - Revisar **Supabase dashboard → Authentication → Users**: confirmar que el usuario no esté `banned_until` ni tenga restricciones.
   - Si el email no está confirmado (`email_confirmed_at` null), Supabase puede rechazar el login.
4. Escalar a on-call si el problema afecta a múltiples usuarios (ver [`docs/RUNBOOK.md`](./RUNBOOK.md)).

---

## "`/admin/clients` no carga clientes"

Este síntoma tiene varias causas posibles (DB abajo, rate limit, service role mal configurado). Está cubierto en detalle en [`docs/RUNBOOK.md`](./RUNBOOK.md) — específicamente las recetas **"Supabase down"**, **"Rate limit ataca a un cliente legítimo"** y **"Deploy de Vercel falló"**. No reproducir aquí para evitar duplicación.

---

## Acceso de emergencia — crear un SUPER_ADMIN manualmente

Escenario: todos los super admins quedaron fuera (fueron demovidos, eliminados, o sus accesos fueron revocados). El sistema bloquea demover al último SUPER_ADMIN, pero pueden quedar fuera por otras vías (ej. alguien editó la DB a mano).

Requiere acceso al **Supabase SQL Editor** del proyecto de producción.

1. Abrir Supabase dashboard → proyecto de prod → **SQL Editor**.
2. Encontrar el UUID del usuario a promover:

   ```sql
   select id, email from auth.users where email = '<tu-email>';
   ```

3. Asegurarte de que ya exista su fila en `Profile` (debería, si alguna vez hizo login). Si no existe:

   ```sql
   insert into "Profile" (id, "globalRole", "createdAt", "updatedAt")
   values ('<UUID-de-arriba>', 'SUPER_ADMIN', now(), now());
   ```

4. Si la fila ya existe, actualiza el rol:

   ```sql
   update "Profile"
   set "globalRole" = 'SUPER_ADMIN', "updatedAt" = now()
   where id = '<UUID-de-arriba>';
   ```

5. Verifica:

   ```sql
   select id, "globalRole" from "Profile" where id = '<UUID-de-arriba>';
   ```

6. Haz logout en la app (para que la sesión refresque el profile) y vuelve a hacer login. Tendrás acceso a `/admin/*`.

Después de recuperar el acceso, entra a `/admin/users` y asegúrate de tener al menos dos usuarios con rol SUPER_ADMIN para que nunca vuelvas a estar en esta situación.

---

## Rutas admin por referencia

- `/admin` — overview con counters (usuarios totales, pendientes, clientes). SUPER_ADMIN only.
- `/admin/users` — gestión de usuarios (aprobar, cambiar rol, modal de acceso).
- `/admin/clients` — gestión de tenants (crear, editar, eliminar).

Los no-super-admin que naveguen a cualquiera de ellas verán 404 o un redirect, según el componente. No hay forma de llegar a ninguna ruta admin sin rol global `SUPER_ADMIN`.
