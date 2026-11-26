// ─────────────────────────────────────────────────────────────
// Registro de visitas.
//   POST /api/visita      → crea la visita y manda los avisos (Telegram / mail)
//   POST /api/visita/fin  → actualiza tiempo y recorrido (secciones, proyectos,
//                            imágenes abiertas y clicks en botones)
// No se guarda la IP de nadie: solo datos aproximados que da Netlify.
// ─────────────────────────────────────────────────────────────
import { visitas, ajustes, updateJSON, getConfig } from './_shared/store.mjs'
import { sendTelegram, sendEmail } from './_shared/notify.mjs'
import {
  json, clean, cleanList, randomId, BOT_PATTERN, describeDevice, describeReferrer, flagEmoji, fechaAR,
} from './_shared/util.mjs'

const KEY_RE = /^v\/\d{13}-[a-z0-9]{12}$/
const MAX_NOTIFS_PER_HOUR = 30 // freno por si alguien abre el sitio mil veces seguidas
const MAX_UPDATE_AGE = 12 * 3600 * 1000

async function readBody(req) {
  const text = await req.text()
  if (text.length > 4000) throw new Error('demasiado grande')
  return JSON.parse(text || '{}')
}

/** Cuenta avisos por hora; devuelve false si ya se mandaron demasiados. */
async function underNotifyLimit() {
  const hour = new Date().toISOString().slice(0, 13)
  let allowed = true
  await updateJSON(ajustes(), `notif/${hour}`, (n) => {
    const count = (n?.count ?? 0) + 1
    allowed = count <= MAX_NOTIFS_PER_HOUR
    return { count }
  }).catch(() => {})
  return allowed
}

function buildMessage(v) {
  const lugar = [...new Set([v.ciudad, v.region, v.pais].filter(Boolean))].join(', ') || 'Ubicación desconocida'
  const lines = [
    '👀 Alguien está viendo tu portfolio',
    '',
    `🕒 ${fechaAR(new Date(v.inicio))} (hora de Argentina)`,
    `${flagEmoji(v.paisCodigo)} ${lugar} (aproximado)`,
    `${v.dispositivo === 'Compu' ? '💻' : '📱'} ${v.dispositivo} · ${v.so} · ${v.navegador}`,
    `🔗 ${v.origen === 'Directo' ? 'Entró directo (link copiado, favorito o app)' : `Vino de ${v.origen}`}`,
    `📄 Página: ${v.pagina}`,
  ]
  if (v.idioma) lines.push(`🗣️ Idioma: ${v.idioma}`)
  return lines.join('\n')
}

async function startVisit(req, context) {
  const ua = req.headers.get('user-agent') ?? ''
  if (!ua || BOT_PATTERN.test(ua)) return new Response(null, { status: 204 })

  let data
  try {
    data = await readBody(req)
  } catch {
    return new Response(null, { status: 400 })
  }

  const geo = context?.geo ?? {}
  const ownHost = (() => { try { return new URL(req.url).hostname } catch { return '' } })()
  const now = Date.now()
  const id = randomId()
  const key = `v/${now}-${id}`

  const visit = {
    id,
    key,
    inicio: new Date(now).toISOString(),
    ultimo: new Date(now).toISOString(),
    duracion: 0,
    pais: clean(geo.country?.name, 60),
    paisCodigo: clean(geo.country?.code, 2),
    region: clean(geo.subdivision?.name, 60),
    ciudad: clean(geo.city, 60),
    zona: clean(geo.timezone, 60),
    ...describeDevice(ua),
    ...describeReferrer(clean(data.referrer, 400), ownHost),
    pagina: clean(data.path, 80) || '/',
    idioma: clean(data.lang, 20),
    pantalla: clean(data.screen, 20),
    secciones: [],
    proyectos: [],
    imagenes: [],
    clicks: [],
  }

  await visitas().setJSON(key, visit, { onlyIfNew: true })

  // Avisos según los interruptores del panel
  const config = await getConfig()
  if ((config.telegram || config.email) && (await underNotifyLimit())) {
    const text = buildMessage(visit)
    const subject = `👀 Nueva visita: ${visit.ciudad || visit.pais || 'ubicación desconocida'} · ${visit.dispositivo}`
    await Promise.all([config.telegram && sendTelegram(text), config.email && sendEmail(subject, text)])
  }

  return json({ key })
}

async function updateVisit(req) {
  let data
  try {
    data = await readBody(req)
  } catch {
    return new Response(null, { status: 400 })
  }
  const key = String(data.key ?? '')
  if (!KEY_RE.test(key)) return new Response(null, { status: 400 })
  if (Date.now() - Number(key.slice(2, 15)) > MAX_UPDATE_AGE) return new Response(null, { status: 410 })

  const duracion = Math.max(0, Math.min(6 * 3600, Math.round(Number(data.duracion) || 0)))
  await updateJSON(
    visitas(),
    key,
    (v) => {
      if (!v) return undefined
      return {
        ...v,
        ultimo: new Date().toISOString(),
        duracion: Math.max(v.duracion ?? 0, duracion),
        // Se suman a lo que ya había (sin repetir) para no perder datos si llegan desordenados
        secciones: cleanList([...(v.secciones ?? []), ...cleanList(data.secciones)]),
        proyectos: cleanList([...(v.proyectos ?? []), ...cleanList(data.proyectos)]),
        imagenes: cleanList([...(v.imagenes ?? []), ...cleanList(data.imagenes)]),
        clicks: cleanList([...(v.clicks ?? []), ...cleanList(data.clicks)]),
      }
    },
    { create: false }
  ).catch((err) => console.error(err))
  return new Response(null, { status: 204 })
}

export default async (req, context) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const path = new URL(req.url).pathname
  try {
    return path.endsWith('/fin') ? await updateVisit(req) : await startVisit(req, context)
  } catch (err) {
    console.error(err)
    return new Response(null, { status: 500 })
  }
}

export const config = { path: ['/api/visita', '/api/visita/fin'] }
