# Backup y restauracion — Content Dashboard 2.O

Audiencia: ops que recibe el proyecto y debe garantizar que no se pierdan datos. Este documento complementa [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) y [`docs/RUNBOOK.md`](./RUNBOOK.md). No duplica el flujo de deploy ni las recetas de on-call.

Regla general: **en el momento en que algo cuesta re-crearse, necesita backup verificado**. El unico estado caro de reconstruir hoy vive en Supabase (Postgres + Auth).

---

## Que necesita backup

### 1. Base de datos Postgres (Supabase) — critico

Es el core del proyecto. Todo dato de negocio (26 modelos de `prisma/schema.prisma`) vive aqui: `Profile`, `Client`, `ClientAccess`, `SocialConnection`, `Competitor`, `Reel`, `Analysis`, `ChatMessage`, `Conversation`, `AIMessage`, `Task`, `ContentPiece`, `YouTubeVideo`, `AccountSnapshot`, etc.

Enfoque recomendado: **snapshot completo de la DB** (`pg_dump`) en vez de backup tabla por tabla. La consistencia referencial entre tablas importa — un backup parcial es dificil de restaurar.

### 2. Auth data (Supabase Auth) — critico

Los usuarios (`auth.users`) y sus sesiones viven en el esquema `auth` de Supabase, gestionado por el servicio de Auth. **No estan cubiertos por un `pg_dump` del esquema `public`** por defecto.

- Para export manual: **Supabase dashboard > Authentication > Users** — hay opcion de CSV export. Limitado, pero suficiente si hace falta auditoria.
- El backup automatico de Supabase (ver mas abajo) si incluye el esquema `auth`.
- El `Profile` de la app (esquema `public`) guarda un espejo de algunos campos (email, displayName, globalRole, avatarUrl). `auth.users.id` = `Profile.id`.

### 3. Storage — hoy NO se usa

Supabase Storage no esta en uso a dia de hoy. Los avatares de usuario se persisten como **data-URL en `Profile.avatarUrl`** (campo `String` en Postgres), o sea que un dump de la DB ya los cubre.

**Importante para el futuro**: el Sprint 5 del [`docs/ROADMAP.md`](./ROADMAP.md) contempla migrar avatares a Supabase Storage. Cuando eso ocurra, este documento **debera expandirse** con una seccion de backup de Storage (buckets, politicas RLS de Storage, frecuencia, y como exportar objetos — ver `supabase storage download` via CLI).

### 4. Secrets y env vars — no hay backup automatico

No se guardan valores reales en git. La fuente de verdad es:

- **Vercel dashboard > Settings > Environment Variables** — valores reales de produccion.
- **`.env.example`** (en el repo) — contrato de que variables existen y para que.
- **GitHub > Settings > Secrets and variables > Actions** — secretos usados por los workflows de CI (`VERCEL_TOKEN`, etc.).

Accion recomendada para el handoff:

1. Exportar la lista de env vars de Vercel a un archivo local cifrado (`vercel env pull .env.production`) y guardar en un **password manager** del equipo, no en git ni en Slack.
2. Mantener acceso de al menos 2 miembros del equipo al Vercel org y al repo de GitHub. Si se pierde el unico owner, no hay recovery.

### 5. OAuth apps externas — mantener acceso

Meta Developer, Google Cloud Console, TikTok Developers — cada uno hospeda la OAuth app usada por `/api/social/[platform]/callback`. Un backup no aplica aqui, pero:

- Guardar credenciales del **admin account** de cada proveedor en el password manager del equipo.
- Documentar quien en el equipo es el owner de cada panel.
- Perder el acceso al panel = no se pueden rotar secrets ni cambiar callbacks.

---

## Frecuencia recomendada

### Automatico (Supabase)

Supabase **free tier** corre **daily automated backups** retenidos **7 dias**. Planes superiores aumentan la retencion y frecuencia.

**Accion inmediata para el ops nuevo**:

1. Ir a **Supabase dashboard > Project Settings > Billing** y confirmar que plan esta activo.
2. Ir a **Database > Backups** y verificar que aparezcan backups recientes listados.
3. Si el proyecto es de largo plazo, considerar subir a un plan con retencion mayor (30+ dias) — 7 dias es poco margen si un bug de datos se descubre tarde.

### Manual (snapshots puntuales)

Recomendado: **un `pg_dump` manual antes de cualquier migracion de schema que toque datos**, y un snapshot mensual archivado fuera de Supabase (ver proceso abajo).

### Retencion a largo plazo

Los backups automaticos de Supabase **no son portables** — viven dentro de Supabase. Si el proyecto Supabase se borra o suspende, el backup se va con el. Para proteccion real:

- Correr `pg_dump` manual una vez al mes.
- Subir el `.sql` cifrado a un bucket externo (S3, GCS) o a un almacenamiento frio del equipo.

---

## Proceso `pg_dump` manual

### Requisitos

- `psql` y `pg_dump` instalados (vienen con Postgres client tools). Confirmar version compatible con Postgres de Supabase.
- La var `DIRECT_URL` de prod (no el pooler). Se obtiene con:

  ```bash
  vercel env pull .env.production
  # o copiar desde Vercel > Settings > Environment Variables
  ```

### Comando exacto

```bash
pg_dump "$DIRECT_URL" --no-owner --no-acl > backup-$(date +%Y%m%d).sql
```

Notas de cada flag:

- **`$DIRECT_URL`** (no `$DATABASE_URL`): el pooler de Supabase (`:6543` con `pgbouncer=true`) no soporta algunas sentencias que `pg_dump` usa internamente. **Siempre** usar la URL directa (`:5432`).
- **`--no-owner`**: omite `ALTER ... OWNER TO <user>`. Evita errores al restaurar en una DB donde los usuarios no existan igual.
- **`--no-acl`**: omite `GRANT` / `REVOKE`. Evita errores de permisos al restaurar en otro proyecto.

Para un dump comprimido (DB grande):

```bash
pg_dump "$DIRECT_URL" --no-owner --no-acl --format=custom --compress=9 \
  --file="backup-$(date +%Y%m%d).dump"
```

Se restaura con `pg_restore` en vez de `psql`.

### Donde guardar el dump

- **Nunca** commitear a git. Agregar `*.sql` y `*.dump` a `.gitignore` si no estan ya.
- **Nunca** pegar en Slack, email o chat. El dump contiene PII (emails, avatares, historial de chat de Eternity AI).
- Guardar cifrado (`gpg`, `age`, bucket con cifrado server-side) en un almacenamiento controlado por el equipo.

---

## Restaurar de backup

**Nunca restaurar directo a produccion**. Proceso canonico:

1. Crear una DB Postgres vacia de staging (proyecto Supabase separado, o una DB local/Docker).
2. Obtener su `DIRECT_URL` y exportarla:

   ```bash
   export STAGING_URL="postgresql://..."
   ```

3. Restaurar:

   ```bash
   psql "$STAGING_URL" < backup-YYYYMMDD.sql
   ```

   Para un dump en formato custom:

   ```bash
   pg_restore --dbname="$STAGING_URL" --no-owner --no-acl backup-YYYYMMDD.dump
   ```

4. Correr smoke test en staging (ver la proxima seccion).
5. Si todo OK, **decidir** si se requiere hacer el mismo proceso en prod (normalmente solo en caso de corrupcion/perdida real) — y coordinar ventana de downtime.

---

## Test de restore (importante)

Un "backup que existe" y un "backup util" no son lo mismo. Una vez por **trimestre** — o siempre que cambie materialmente el schema — correr este test:

1. Tomar el backup automatico mas reciente de Supabase (o un `pg_dump` manual).
2. Restaurar sobre una DB vacia de staging (pasos anteriores).
3. Apuntar una instancia de la app (local o preview de Vercel) a esa DB de staging.
4. Smoke test minimo:
   - Login con un usuario real.
   - Ver `/admin/clients` lista clientes (SUPER_ADMIN).
   - Ver `/competidores` de un `Client` con datos — cargar al menos un `Reel`.
   - Cargar una ruta de API que requiera `requireActiveClient()`, ej. `GET /api/instagram/reels`.
5. Documentar el resultado (fecha, version del schema, issues encontrados) en el channel interno del equipo.

Si el test falla, **ese es el momento de arreglarlo** — no cuando hay perdida real.

---

## Checklist rapido (cada trimestre)

- [ ] Plan de Supabase confirmado, retencion de backups suficiente.
- [ ] `pg_dump` manual reciente (ultimos 30 dias) archivado fuera de Supabase.
- [ ] Test de restore ejecutado y documentado.
- [ ] Al menos 2 personas con acceso a Vercel org y a cada OAuth panel externo.
- [ ] `.env.example` sincronizado con las vars reales de Vercel.

---

## Que NO hacer

- **No** commitear `backup*.sql` / `backup*.dump` a git.
- **No** pegar dumps en Slack, email, issue trackers, o cualquier canal sin cifrado.
- **No** usar `pg_restore --clean` sin entender que hace — borra y recrea objetos, puede destruir datos que no estaban en el dump.
- **No** restaurar directo a prod sin haber restaurado primero a staging.
- **No** confiar solo en los backups automaticos de Supabase — si el proyecto Supabase se cancela/suspende, el backup se va con el.
- **No** asumir que un backup de la DB cubre los avatares cuando se migren a Supabase Storage (Sprint 5) — ese caso requerira expandir este documento.

---

by eternity
