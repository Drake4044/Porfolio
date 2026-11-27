// Utilidades compartidas: variables de entorno, hashing, respuestas JSON.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const env = (key) => globalThis.Netlify?.env?.get(key) ?? process.env[key]

export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex')

/** Compara dos textos sin filtrar información por el tiempo que tarda. */
export function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a ?? '')).digest()
  const hb = createHash('sha256').update(String(b ?? '')).digest()
  return timingSafeEqual(ha, hb)
}

export const randomId = (bytes = 9) =>
  randomBytes(bytes).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').padEnd(12, '0').slice(0, 12)

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })

/** Recorta y limpia texto que viene del navegador (nunca confiar en datos de afuera). */
export const clean = (value, max = 120) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f<>]/g, '')
    .slice(0, max)
    .trim()

export const cleanList = (list, maxItems = 40, maxLen = 80) =>
  Array.isArray(list) ? [...new Set(list.map((x) => clean(x, maxLen)).filter(Boolean))].slice(0, maxItems) : []

/** Clave para firmar sesiones. Cambia si cambiás usuario, contraseña o dirección del panel. */
export const sessionKey = () => sha256(`pf-session|${env('ADMIN_USER')}|${env('ADMIN_PASSWORD')}|${env('PANEL_PATH')}`)

export const hmac = (data) => createHmac('sha256', sessionKey()).update(data).digest('base64url')

/** Identificador anónimo de la conexión, solo para frenar intentos de login (no se guarda la IP). */
export const ipTag = (context, req) => sha256(`${sessionKey()}|${context?.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'local'}`).slice(0, 24)

export const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|lighthouse|headless|curl|wget|python|axios|node-fetch|go-http|java\//i

export function describeDevice(ua) {
  const isTablet = /iPad|Tablet/i.test(ua)
  const isMobile = !isTablet && /Mobi|Android|iPhone/i.test(ua)
  const dispositivo = isTablet ? 'Tablet' : isMobile ? 'Celular' : 'Compu'
  let so = 'Otro'
  if (/Android/i.test(ua)) so = 'Android'
  else if (/iPhone|iPad|iOS/i.test(ua)) so = 'iOS'
  else if (/Windows/i.test(ua)) so = 'Windows'
  else if (/Mac OS/i.test(ua)) so = 'Mac'
  else if (/Linux/i.test(ua)) so = 'Linux'
  let navegador = 'Otro'
  if (/Edg\//i.test(ua)) navegador = 'Edge'
  else if (/OPR\//i.test(ua)) navegador = 'Opera'
  else if (/SamsungBrowser/i.test(ua)) navegador = 'Samsung Internet'
  else if (/Firefox\//i.test(ua)) navegador = 'Firefox'
  else if (/Chrome\//i.test(ua)) navegador = 'Chrome'
  else if (/Safari\//i.test(ua)) navegador = 'Safari'
  return { dispositivo, so, navegador }
}

const KNOWN_ORIGINS = {
  'linkedin.com': 'LinkedIn', 'lnkd.in': 'LinkedIn', 'github.com': 'GitHub',
  'google.com': 'Google', 'google.com.ar': 'Google', 'bing.com': 'Bing', 'duckduckgo.com': 'DuckDuckGo',
  'instagram.com': 'Instagram', 'l.instagram.com': 'Instagram', 't.co': 'X / Twitter', 'x.com': 'X / Twitter',
  'facebook.com': 'Facebook', 'l.facebook.com': 'Facebook', 'm.facebook.com': 'Facebook', 'mail.google.com': 'Gmail',
  'outlook.live.com': 'Outlook', 'web.whatsapp.com': 'WhatsApp', 'chatgpt.com': 'ChatGPT', 'claude.ai': 'Claude',
}

/** Devuelve { origen, origenHost } guardando solo el dominio, nunca la URL completa. */
export function describeReferrer(referrer, ownHost) {
  if (!referrer) return { origen: 'Directo', origenHost: '' }
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '')
    if (ownHost && host === ownHost.replace(/^www\./, '')) return { origen: 'Directo', origenHost: '' }
    return { origen: KNOWN_ORIGINS[host] ?? host, origenHost: host }
  } catch {
    return { origen: 'Desconocido', origenHost: '' }
  }
}

export function flagEmoji(code) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '🌎'
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}

export const fechaAR = (date = new Date()) =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)

// Ciudades donde hay grandes centros de datos (Google, Amazon, Microsoft, Meta…).
// Una visita desde ahí suele ser un robot o un escáner de seguridad, no una persona.
const DATACENTER_CITIES = [
  'council bluffs', 'ashburn', 'boardman', 'the dalles', 'prineville', 'quincy', 'lenoir',
  'moncks corner', 'pryor', 'papillion', 'altoona', 'forest city', 'clarksville', 'lithia springs',
  'new albany', 'mayes county',
]
export const isDatacenterCity = (city) => DATACENTER_CITIES.includes(String(city ?? '').toLowerCase())

/** Valida la etiqueta de los links ?ref=empresa-x */
export const cleanRef = (ref) =>
  String(ref ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
