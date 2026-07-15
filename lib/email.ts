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

/**
 * Shared branded email shell. Brand palette (from app/globals.css):
 *   --accent            #8E1F2F  (brand red)
 *   --accent-foreground #F5EDE3  (cream)
 * Email clients strip <style>/CSS-vars, so literal hex + inline styles are
 * required here (this file lives in lib/, outside the check:brand scan scope).
 */
const BRAND = {
  accent: '#8E1F2F',
  accentFg: '#F5EDE3',
  pageBg: '#F5EDE3',
  card: '#FFFFFF',
  border: '#E7DCCF',
  text: '#1A1516',
  muted: '#6B615C',
} as const

function emailShell(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${BRAND.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.pageBg};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:36px 36px 32px 36px;">
                <div style="display:inline-block;width:44px;height:44px;line-height:44px;text-align:center;border-radius:12px;background-color:${BRAND.accent};color:${BRAND.accentFg};font-weight:700;font-size:20px;margin-bottom:20px;">E</div>
                <h1 style="margin:0 0 2px 0;font-size:19px;font-weight:700;color:${BRAND.text};">Content Dashboard</h1>
                <p style="margin:0 0 24px 0;font-size:12px;color:${BRAND.muted};letter-spacing:0.02em;">by eternity</p>
                ${bodyHtml}
                <p style="margin:36px 0 0 0;font-size:11px;color:${BRAND.muted};border-top:1px solid ${BRAND.border};padding-top:16px;">Este correo se envió automáticamente desde Content Dashboard. Si no esperabas este mensaje, podés ignorarlo.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function brandButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 22px;background-color:${BRAND.accent};color:${BRAND.accentFg};text-decoration:none;font-weight:600;font-size:14px;border-radius:12px;">${escapeHtml(label)}</a>`
}

function buildSignupEmailHtml(params: NewSignupEmailParams): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://content-dashboard-coral.vercel.app'
  const adminUsersUrl = `${appUrl.replace(/\/$/, '')}/admin/users`
  const signupAtStr = params.signupAt.toISOString()
  const body = `
                <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:${BRAND.text};">Nuevo registro</h2>
                <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${BRAND.text};">
                  Un nuevo usuario se registró: <strong style="color:${BRAND.accent};">${escapeHtml(params.email)}</strong>. Revisá y gestionalo en <code style="color:${BRAND.accent};">/admin/users</code>.
                </p>
                <p style="margin:0 0 24px 0;font-size:12px;color:${BRAND.muted};">Registrado el ${escapeHtml(signupAtStr)}</p>
                ${brandButton(adminUsersUrl, 'Ir a /admin/users')}`
  return emailShell(body, 'Nuevo registro — Content Dashboard')
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
