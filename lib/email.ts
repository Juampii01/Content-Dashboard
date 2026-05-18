/**
 * Email helpers powered by Resend.
 *
 * Singleton client + typed helpers for transactional emails. If
 * RESEND_API_KEY is missing, `sendNewSignupNotification` logs a warning and
 * returns silently instead of throwing — signup flows must never be blocked
 * by a missing email credential.
 *
 * TODO: replace `onboarding@resend.dev` with a verified sender domain once
 * DNS records are configured on Resend.
 */
import { Resend } from 'resend'

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'cristianortiz@astraire.com'

let cachedResend: Resend | null = null

export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!cachedResend) cachedResend = new Resend(apiKey)
  return cachedResend
}

// Back-compat: a direct `resend` export that is `null` if unconfigured.
export const resend = getResend()

interface NewSignupEmailParams {
  email: string
  signupAt: Date
}

function buildSignupEmailHtml(params: NewSignupEmailParams): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://content-dashboard.vercel.app'
  const adminUsersUrl = `${appUrl.replace(/\/$/, '')}/admin/users`
  const signupAtStr = params.signupAt.toISOString()
  // Inline styles only — email clients strip <style>/classes.
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Nuevo registro — Content Dashboard</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fafafa;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#111111;border:1px solid #222222;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                <div style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;border-radius:10px;background-color:#d4ff00;color:#0a0a0a;font-weight:700;font-size:18px;margin-bottom:16px;">E</div>
                <h1 style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:#fafafa;">Content Dashboard</h1>
                <p style="margin:0 0 24px 0;font-size:12px;color:#a1a1aa;">by eternity</p>
                <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#fafafa;">Nuevo registro pendiente</h2>
                <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#d4d4d8;">
                  Un nuevo usuario se ha registrado: <strong style="color:#fafafa;">${escapeHtml(params.email)}</strong>. Está pendiente de aprobación en <code style="color:#d4ff00;">/admin/users</code>.
                </p>
                <p style="margin:0 0 24px 0;font-size:12px;color:#71717a;">Registrado el ${escapeHtml(signupAtStr)}</p>
                <a href="${escapeHtml(adminUsersUrl)}" style="display:inline-block;padding:12px 20px;background-color:#d4ff00;color:#0a0a0a;text-decoration:none;font-weight:600;font-size:14px;border-radius:12px;">Revisar en /admin/users</a>
                <p style="margin:32px 0 0 0;font-size:11px;color:#52525b;">Este correo se envió automáticamente desde Content Dashboard.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Send an admin notification whenever a new user registers. Never throws.
 */
export async function sendNewSignupNotification(params: NewSignupEmailParams): Promise<void> {
  const client = getResend()
  if (!client) {
    console.warn('[email] RESEND_API_KEY missing — skipping signup notification')
    return
  }

  try {
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to: SUPER_ADMIN_EMAIL,
      subject: `[Content Dashboard] Nuevo registro: ${params.email}`,
      html: buildSignupEmailHtml(params),
    })
    if (error) {
      console.error('[email] Resend returned error:', error)
    }
  } catch (err) {
    console.error('[email] Failed to send signup notification:', err)
  }
}
