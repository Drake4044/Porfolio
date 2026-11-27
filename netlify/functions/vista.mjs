// ─────────────────────────────────────────────────────────────
// Contador público de visitas.
//   POST /api/vista        suma 1 (cada vez que se abre o recarga la página)
//   GET  /api/vista/token  token nuevo para seguir escuchando en vivo
// Los robots no suman. El número se transmite en vivo por Ably a quien
// tenga la página abierta.
// ─────────────────────────────────────────────────────────────
import { ajustes, visitas, updateJSON } from './_shared/store.mjs'
import { publish, subscribeToken, PUBLIC_CHANNEL } from './_shared/ably.mjs'
import { json, BOT_PATTERN } from './_shared/util.mjs'

const KEY = 'contador'

/** La primera vez arranca desde las visitas que ya estaban guardadas (no inventa números). */
async function initialTotal() {
  const store = visitas()
  const recent = (await store.list({ prefix: 'v/' })).blobs.length
  const months = (await store.list({ prefix: 'm/' })).blobs
  let bundled = 0
  for (const b of months) bundled += ((await store.get(b.key, { type: 'json' })) ?? []).length
  return recent + bundled
}

export default async (req) => {
  const path = new URL(req.url).pathname
  try {
    if (req.method === 'GET' && path.endsWith('/token')) {
      return json({ live: await subscribeToken(PUBLIC_CHANNEL) })
    }
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

    const ua = req.headers.get('user-agent') ?? ''
    if (!ua || BOT_PATTERN.test(ua)) {
      const current = await ajustes().get(KEY, { type: 'json' })
      return json({ total: current?.total ?? 0, live: null })
    }

    let base = null
    const exists = await ajustes().get(KEY, { type: 'json' })
    if (!exists) base = await initialTotal()
    const next = await updateJSON(ajustes(), KEY, (c) => ({ total: (c?.total ?? base ?? 0) + 1 }))

    const [, live] = await Promise.all([publish(PUBLIC_CHANNEL, 'total', { total: next.total }), subscribeToken(PUBLIC_CHANNEL)])
    return json({ total: next.total, live })
  } catch (err) {
    console.error(err)
    return json({ total: null, live: null }, 500)
  }
}

export const config = { path: ['/api/vista', '/api/vista/token'] }
