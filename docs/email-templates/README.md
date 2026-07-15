# Emails con Resend — guía de conexión

Los emails de **restablecer contraseña** y **confirmar registro** los envía **Supabase Auth**.
Para que salgan por tu cuenta paga de **Resend** (mejor entregabilidad, tu dominio, sin límites de
spam), se configura Resend como **servidor SMTP** de Supabase. El código de la app ya usa Resend
para la notificación de nuevos registros (`lib/email.ts`).

## Fase 0 — Verificar el dominio en Resend (bloqueante)

> Un subdominio `*.vercel.app` **no sirve** como remitente: no podés cargarle DNS. Usá un dominio propio.
> Remitente elegido: **`no-reply@astraire.com`**.

1. Resend → **Domains → Add Domain** → `astraire.com`.
2. Cargá en tu proveedor de DNS los registros que te da Resend (**SPF**, **DKIM**, y **DMARC** recomendado).
3. Esperá a que Resend marque el dominio como **Verified** (minutos a unas horas).

## Fase 1 — SMTP en Supabase (proyecto nuevo `hjlfpiiatahzqiohcvke`)

Dashboard → **Authentication → Emails → SMTP Settings → Enable Custom SMTP**:

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | **tu `RESEND_API_KEY`** (empieza con `re_…`) |
| Sender email | `no-reply@astraire.com` |
| Sender name | `Content Dashboard` |

Luego en **Authentication → Rate Limits** subí el límite de emails/hora (con Resend pago podés
mandar muchos más que el default de Supabase).

## Fase 2 — Templates branded

Dashboard → **Authentication → Email Templates**. Pegá el HTML de estos archivos en "Message body":

| Template de Supabase | Archivo | Subject sugerido |
|---|---|---|
| Reset Password | `reset-password.html` | `Restablecé tu contraseña — Content Dashboard` |
| Confirm signup | `confirm-signup.html` | `Confirmá tu correo — Content Dashboard` |

(Ambos usan la variable `{{ .ConfirmationURL }}` de Supabase y la paleta de marca crema + rojo.)

## Fase 3 — URLs de redirect

Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://content-dashboard-coral.vercel.app`
- **Redirect URLs (allow list):** agregá `https://content-dashboard-coral.vercel.app/auth/reset-password`
  (a donde llega el link de reset — el código ya lo pasa como `redirectTo`).

## Fase 4 — Variables de entorno (app)

En **Vercel → Production/Preview** (y ya en `.env.local` local):

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | `re_…` (misma key que el SMTP) |
| `RESEND_FROM_EMAIL` | `no-reply@astraire.com` |
| `SUPER_ADMIN_EMAIL` | `cristianortiz@astraire.com` (a quién llegan las notificaciones de signup) |

## Fase 5 — Verificación

1. En `/login` → "¿Olvidaste tu contraseña?" → ingresás tu email → llega el mail de reset **desde `astraire.com`**, con branding, no a spam.
2. El link abre `/auth/reset-password` → cambiás la contraseña → redirige a `/login`.
3. Un registro nuevo → llega el mail de confirmación + la notificación al admin.
4. Revisá **Resend → Logs**: los envíos deben aparecer como `delivered`.

> Nota: mientras el dominio no esté verificado, Resend solo entrega a tu propio email (modo prueba).
