// ─────────────────────────────────────────────────────────────
// API privada del panel. Todo pide sesión, salvo el login.
//   POST /api/s/login    usuario + contraseña → manda un código de 6 dígitos
//   POST /api/s/codigo   código → abre la sesión (cookie firmada, 8 h)
//   GET  /api/s/yo       ¿hay sesión? + interruptores
//   GET  /api/s/visitas  todas las visitas
//   POST /api/s/ajustes  prender / apagar Telegram y mail
//   POST /api/s/prueba   manda un aviso de prueba
//   POST /api/s/salir    cierra la sesión
//   GET  /api/s/vivo     token para escuchar visitas y mensajes en vivo (Ably)
//   POST /api/s/borrar   borra visitas { ids: [...] }
//   GET  /api/s/mensajes            mensajes del formulario de contacto
//   POST /api/s/mensajes/leido      { ids, leido }
//   POST /api/s/mensajes/borrar     { ids }
//
// Variables de entorno: ADMIN_USER, ADMIN_PASSWORD, PANEL_PATH
// (+ TELEGRAM_* y/o RESEND_API_KEY + NOTIFY_EMAIL para mandar el código).
// ─────────────────────────────────────────────────────────────
import { randomInt } from 'node:crypto'
import { visitas, ajustes, mensajes, updateJSON, getConfig } from './_shared/store.mjs'
import { subscribeToken, panelChannel, ablyReady } from './_shared/ably.mjs'
import { sendTelegram, sendEmail, telegramReady, emailReady } from './_shared/notify.mjs'
import { env, json, safeEqual, sha256, hmac, ipTag, randomId, fechaAR } from './_shared/util.mjs'

const SESSION_HOURS = 8
const MAX_LOGIN_FAILS = 5
const LOCK_MINUTES = 15
const CODE_MINUTES = 5
const MAX_CODE_TRIES = 5
const COMPACT_AFTER_MS = 24 * 3600 * 1000
const COOKIE = 'pf_s'

const configured = () => Boolean(env('ADMIN_USER') && env('ADMIN_PASSWORD') && env('PANEL_PATH'))

// ── Sesión ─────────────────────────────────────────────────
function makeSessionCookie(req) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000, n: randomId() })).toString('base64url')
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${payload}.${hmac(payload)}; Path=/api/s; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${secure}`
}
const clearCookie = `${COOKIE}=; Path=/api/s; HttpOnly; SameSite=Strict; Max-Age=0`

function hasSession(req) {
  const raw = (req.headers.get('cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))
  if (!raw) return false
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.')
  if (!payload || !sig || !safeEqual(sig, hmac(payload))) return false
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now()
  } catch {
    return false
  }
}

// ── Login en dos pasos ─────────────────────────────────────
async function login(req, context) {
  const tag = ipTag(context, req)
  const lockKey = `login/${tag}`
  const lock = await ajustes().get(lockKey, { type: 'json' })
  if (lock?.until > Date.now()) {
    const min = Math.ceil((lock.until - Date.now()) / 60000)
    return json({ error: `Demasiados intentos. Probá de nuevo en ${min} min.` }, 429)
  }

  const { user, pass } = await req.json().catch(() => ({}))
  const ok = safeEqual(user, env('ADMIN_USER')) & safeEqual(pass, env('ADMIN_PASSWORD'))
  if (!ok) {
    await updateJSON(ajustes(), lockKey, (l) => {
      const fails = (l?.until && l.until < Date.now() ? 0 : l?.fails ?? 0) + 1
      return { fails, until: fails >= MAX_LOGIN_FAILS ? Date.now() + LOCK_MINUTES * 60000 : 0 }
    }).catch(() => {})
    // Pausa fija para que probar contraseñas sea lento
    await new Promise((r) => setTimeout(r, 600))
    return json({ error: 'Usuario o contraseña incorrectos.' }, 401)
  }
  await ajustes().delete(lockKey).catch(() => {})

  if (!telegramReady() && !emailReady()) {
    return json({ error: 'Falta configurar Telegram o el mail para recibir el código.' }, 503)
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const challenge = randomId()
  await ajustes().setJSON(`reto/${challenge}`, {
    codeHash: sha256(`${challenge}|${code}`),
    exp: Date.now() + CODE_MINUTES * 60000,
    tries: 0,
    tag,
  })

  const text = `🔐 Tu código para entrar al panel: ${code}\n\nVence en ${CODE_MINUTES} minutos. Si no fuiste vos, cambiá la contraseña (ADMIN_PASSWORD) en Netlify.`
  const sent = await Promise.all([sendTelegram(text), sendEmail('🔐 Código para entrar al panel', text)])
  const canales = [sent[0] && 'Telegram', sent[1] && 'mail'].filter(Boolean)
  if (!canales.length) return json({ error: 'No se pudo enviar el código. Revisá Telegram o el mail en Netlify.' }, 502)
  return json({ challenge, canales })
}

async function verifyCode(req, context) {
  const { challenge, code } = await req.json().catch(() => ({}))
  if (!/^[a-z0-9]{12}$/.test(String(challenge ?? ''))) return json({ error: 'Código inválido.' }, 400)
  const key = `reto/${challenge}`
  const reto = await ajustes().get(key, { type: 'json' })
  if (!reto || reto.exp < Date.now() || reto.tag !== ipTag(context, req)) {
    await ajustes().delete(key).catch(() => {})
    return json({ error: 'El código venció. Volvé a ingresar.', restart: true }, 401)
  }
  if (!safeEqual(sha256(`${challenge}|${String(code ?? '').trim()}`), reto.codeHash)) {
    const tries = reto.tries + 1
    if (tries >= MAX_CODE_TRIES) {
      await ajustes().delete(key)
      return json({ error: 'Demasiados intentos. Volvé a ingresar.', restart: true }, 401)
    }
    await ajustes().setJSON(key, { ...reto, tries })
    await new Promise((r) => setTimeout(r, 400))
    return json({ error: `Código incorrecto. Te quedan ${MAX_CODE_TRIES - tries} intentos.` }, 401)
  }
  await ajustes().delete(key)
  sendTelegram(`✅ Entraste al panel · ${fechaAR()}`).catch(() => {})
  return json({ ok: true }, 200, { 'set-cookie': makeSessionCookie(req) })
}

// ── Visitas ────────────────────────────────────────────────
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    })
  )
  return out
}

/**
 * Las visitas nuevas se guardan una por una (v/...). Las de más de 24 h ya no
 * cambian, así que al abrir el panel se agrupan en un paquete por mes (m/AAAA-MM):
 * el panel carga mucho más rápido aunque haya miles.
 */
async function loadVisits() {
  const store = visitas()
  const { blobs } = await store.list({ prefix: 'v/' })
  const loaded = (await mapLimit(blobs, 16, (b) => store.get(b.key, { type: 'json' }))).filter(Boolean)

  const old = loaded.filter((v) => Date.now() - Date.parse(v.inicio) > COMPACT_AFTER_MS)
  const recent = loaded.filter((v) => !old.includes(v))
  const byMonth = Map.groupBy ? Map.groupBy(old, (v) => v.inicio.slice(0, 7)) : groupBy(old, (v) => v.inicio.slice(0, 7))
  for (const [month, list] of byMonth) {
    await updateJSON(store, `m/${month}`, (bundle) => {
      const ids = new Set((bundle ?? []).map((v) => v.id))
      return [...(bundle ?? []), ...list.filter((v) => !ids.has(v.id))]
    })
    await mapLimit(list, 16, (v) => store.delete(v.key))
  }

  const months = (await store.list({ prefix: 'm/' })).blobs
  const bundles = await mapLimit(months, 8, (b) => store.get(b.key, { type: 'json' }))
  const all = [...bundles.flat().filter(Boolean), ...recent]
  const seen = new Set()
  return all
    .filter((v) => (seen.has(v.id) ? false : seen.add(v.id)))
    .sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio))
}

function groupBy(list, fn) {
  const m = new Map()
  for (const x of list) m.set(fn(x), [...(m.get(fn(x)) ?? []), x])
  return m
}

/** Borra visitas por id, estén sueltas (v/...) o dentro de un paquete mensual (m/...). */
async function deleteVisits(ids) {
  const wanted = new Set(ids.filter((id) => /^[a-z0-9]{12}$/.test(String(id))))
  if (!wanted.size) return 0
  const store = visitas()
  let deleted = 0
  for (const b of (await store.list({ prefix: 'v/' })).blobs) {
    if (wanted.has(b.key.slice(-12))) {
      await store.delete(b.key)
      deleted++
    }
  }
  for (const b of (await store.list({ prefix: 'm/' })).blobs) {
    await updateJSON(store, b.key, (bundle) => {
      const kept = (bundle ?? []).filter((v) => !wanted.has(v.id))
      if (kept.length === (bundle ?? []).length) return undefined // nada que cambiar
      deleted += (bundle ?? []).length - kept.length
      return kept
    }, { create: false })
  }
  return deleted
}

async function loadMessages() {
  const store = mensajes()
  const { blobs } = await store.list({ prefix: 'c/' })
  const list = (await mapLimit(blobs, 16, (b) => store.get(b.key, { type: 'json' }))).filter(Boolean)
  return list.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
}

const validIds = (ids) => (Array.isArray(ids) ? ids.map(String).filter((id) => /^[a-z0-9]{12}$/.test(id)).slice(0, 1000) : [])

// ── Router ─────────────────────────────────────────────────
export default async (req, context) => {
  if (!configured()) return json({ error: 'El panel todavía no está configurado en Netlify.' }, 503)
  const action = new URL(req.url).pathname.replace(/^\/api\/s\/?/, '')

  // Protección extra contra pedidos desde otros sitios
  if (req.method === 'POST' && req.headers.get('x-pf') !== '1') return json({ error: 'Pedido inválido.' }, 403)

  try {
    if (req.method === 'POST' && action === 'login') return await login(req, context)
    if (req.method === 'POST' && action === 'codigo') return await verifyCode(req, context)

    if (!hasSession(req)) return json({ error: 'Sesión vencida.' }, 401, { 'set-cookie': clearCookie })

    if (req.method === 'GET' && action === 'yo') {
      return json({ ok: true, config: await getConfig(), canales: { telegram: telegramReady(), email: emailReady() } })
    }
    if (req.method === 'GET' && action === 'visitas') return json({ visitas: await loadVisits() })
    if (req.method === 'POST' && action === 'ajustes') {
      const body = await req.json().catch(() => ({}))
      const next = await updateJSON(ajustes(), 'config', (c) => ({
        ...(c ?? {}),
        ...(typeof body.telegram === 'boolean' ? { telegram: body.telegram } : {}),
        ...(typeof body.email === 'boolean' ? { email: body.email } : {}),
      }))
      return json({ config: { telegram: true, email: true, ...next } })
    }
    if (req.method === 'POST' && action === 'prueba') {
      const config = await getConfig()
      const text = `🧪 Aviso de prueba del panel · ${fechaAR()}\nSi te llegó, este canal funciona.`
      const [telegram, email] = await Promise.all([
        config.telegram ? sendTelegram(text) : false,
        config.email ? sendEmail('🧪 Aviso de prueba del portfolio', text) : false,
      ])
      return json({ telegram, email })
    }
    if (req.method === 'GET' && action === 'vivo') {
      if (!ablyReady()) return json({ live: null, error: 'Falta ABLY_API_KEY en Netlify.' })
      return json({ live: await subscribeToken(panelChannel(), 120) })
    }
    if (req.method === 'POST' && action === 'borrar') {
      const { ids } = await req.json().catch(() => ({}))
      return json({ borradas: await deleteVisits(validIds(ids)) })
    }
    if (req.method === 'GET' && action === 'mensajes') return json({ mensajes: await loadMessages() })
    if (req.method === 'POST' && (action === 'mensajes/leido' || action === 'mensajes/borrar')) {
      const body = await req.json().catch(() => ({}))
      const ids = new Set(validIds(body.ids))
      const store = mensajes()
      let n = 0
      for (const b of (await store.list({ prefix: 'c/' })).blobs) {
        if (!ids.has(b.key.slice(-12))) continue
        if (action === 'mensajes/borrar') await store.delete(b.key)
        else await updateJSON(store, b.key, (m) => (m ? { ...m, leido: body.leido !== false } : undefined), { create: false })
        n++
      }
      return json({ ok: true, n })
    }
    if (req.method === 'POST' && action === 'salir') return json({ ok: true }, 200, { 'set-cookie': clearCookie })
    return json({ error: 'No encontrado.' }, 404)
  } catch (err) {
    console.error(err)
    return json({ error: 'Error interno.' }, 500)
  }
}

export const config = { path: '/api/s/*' }
