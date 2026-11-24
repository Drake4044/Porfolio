// ─────────────────────────────────────────────────────────────
// Aviso de visitas por Telegram (Netlify Function).
// El sitio llama a POST /api/visita una vez por visita; esta función
// arma un mensaje con datos aproximados y anónimos y te lo manda.
//
// Variables de entorno (se cargan en Netlify, NUNCA en el código):
//   TELEGRAM_BOT_TOKEN  → el token que te da @BotFather
//   TELEGRAM_CHAT_ID    → tu número de chat con el bot
// Si faltan, la función no hace nada (el sitio sigue andando igual).
// ─────────────────────────────────────────────────────────────

const env = (key) => globalThis.Netlify?.env?.get(key) ?? process.env[key]

const BOT_PATTERN = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|lighthouse|headless|curl|wget|python|axios|node-fetch/i

// Recorta y limpia lo que manda el navegador (nunca confiar en datos de afuera)
const clean = (value, max = 120) =>
  String(value ?? '')
    .replace(/[<>&]/g, '')
    .slice(0, max)
    .trim()

function describeDevice(ua) {
  const isTablet = /iPad|Tablet/i.test(ua)
  const isMobile = !isTablet && /Mobi|Android|iPhone/i.test(ua)
  const device = isTablet ? '📱 Tablet' : isMobile ? '📱 Celular' : '💻 Compu'

  let os = 'otro sistema'
  if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS'
  else if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS/i.test(ua)) os = 'Mac'
  else if (/Linux/i.test(ua)) os = 'Linux'

  let browser = 'otro navegador'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/OPR\//i.test(ua)) browser = 'Opera'
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua)) browser = 'Safari'

  return `${device} · ${os} · ${browser}`
}

function describeReferrer(referrer, ownHost) {
  if (!referrer) return 'Entró directo (link copiado, favorito o app)'
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '')
    if (ownHost && host === ownHost.replace(/^www\./, '')) return 'Desde el mismo portfolio'
    const known = {
      'linkedin.com': 'LinkedIn', 'lnkd.in': 'LinkedIn', 'github.com': 'GitHub',
      'google.com': 'Google', 'google.com.ar': 'Google', 'bing.com': 'Bing',
      'instagram.com': 'Instagram', 'l.instagram.com': 'Instagram',
      't.co': 'X / Twitter', 'x.com': 'X / Twitter', 'facebook.com': 'Facebook',
      'l.facebook.com': 'Facebook', 'mail.google.com': 'Gmail',
    }
    return `Vino de ${known[host] ?? host}`
  } catch {
    return 'Origen desconocido'
  }
}

export default async (req, context) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const token = env('TELEGRAM_BOT_TOKEN')
  const chatId = env('TELEGRAM_CHAT_ID')
  if (!token || !chatId) return new Response(null, { status: 204 })

  const ua = req.headers.get('user-agent') ?? ''
  if (!ua || BOT_PATTERN.test(ua)) return new Response(null, { status: 204 })

  let data = {}
  try {
    const text = await req.text()
    if (text.length > 2000) return new Response(null, { status: 413 })
    data = JSON.parse(text || '{}')
  } catch {
    return new Response(null, { status: 400 })
  }

  const geo = context?.geo ?? {}
  const place = [...new Set([geo.city, geo.subdivision?.name, geo.country?.name].filter(Boolean))].join(', ') || 'Ubicación desconocida'
  const flag = geo.country?.code
    ? String.fromCodePoint(...[...geo.country.code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
    : '🌎'

  const when = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date())

  const ownHost = (() => { try { return new URL(req.url).hostname } catch { return '' } })()

  const lines = [
    '👀 Alguien está viendo tu portfolio',
    '',
    `🕒 ${when} (hora de Argentina)`,
    `${flag} ${clean(place)} (aproximado)`,
    describeDevice(ua),
    `🔗 ${clean(describeReferrer(clean(data.referrer, 300), ownHost))}`,
    `📄 Página: ${clean(data.path, 80) || '/'}`,
  ]
  if (data.lang) lines.push(`🗣️ Idioma: ${clean(data.lang, 20)}`)

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), disable_web_page_preview: true }),
    })
    if (!res.ok) console.error('Telegram respondió', res.status)
  } catch (err) {
    console.error('No se pudo avisar por Telegram', err)
  }
  return new Response(null, { status: 204 })
}

export const config = { path: '/api/visita' }
