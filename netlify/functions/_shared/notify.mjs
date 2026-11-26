// Envío de avisos: Telegram y mail (Resend).
import { env } from './util.mjs'

export const telegramReady = () => Boolean(env('TELEGRAM_BOT_TOKEN') && env('TELEGRAM_CHAT_ID'))
export const emailReady = () => Boolean(env('RESEND_API_KEY') && env('NOTIFY_EMAIL'))

export async function sendTelegram(text) {
  if (!telegramReady()) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env('TELEGRAM_CHAT_ID'), text, disable_web_page_preview: true }),
    })
    if (!res.ok) console.error('Telegram respondió', res.status)
    return res.ok
  } catch (err) {
    console.error('No se pudo enviar a Telegram', err)
    return false
  }
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export async function sendEmail(subject, text) {
  if (!emailReady()) return false
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">${text
    .split('\n')
    .map((l) => (l ? escapeHtml(l) : '&nbsp;'))
    .join('<br>')}</div>`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env('RESEND_API_KEY')}` },
      body: JSON.stringify({
        // Sin dominio propio, Resend permite enviar desde su dirección de prueba a tu propio mail
        from: env('EMAIL_FROM') || 'Portfolio <onboarding@resend.dev>',
        to: [env('NOTIFY_EMAIL')],
        subject,
        text,
        html,
      }),
    })
    if (!res.ok) console.error('Resend respondió', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (err) {
    console.error('No se pudo enviar el mail', err)
    return false
  }
}
