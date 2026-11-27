// Tiempo real con Ably (sin librerías): publicar por REST y emitir tokens
// de solo lectura para que el navegador escuche por Server-Sent Events.
// Variable de entorno: ABLY_API_KEY  (formato "appId.keyId:secreto")
import { env, sha256, sessionKey } from './util.mjs'

const REST = 'https://rest.ably.io'
// ABLY_SSE_HOST solo se usa en pruebas locales
const sseHost = () => env('ABLY_SSE_HOST') || 'https://main.realtime.ably.net'

export const ablyReady = () => /^[^.:\s]+\.[^:\s]+:\S+$/.test(env('ABLY_API_KEY') ?? '')

const auth = () => 'Basic ' + Buffer.from(env('ABLY_API_KEY')).toString('base64')

/** Canal público del contador de visitas. */
export const PUBLIC_CHANNEL = 'pf-contador'
/** Canal privado del panel: su nombre depende de tus credenciales, nadie lo puede adivinar. */
export const panelChannel = () => `pf-panel-${sha256(`${sessionKey()}|ably`).slice(0, 20)}`

export async function publish(channel, name, data) {
  if (!ablyReady()) return false
  try {
    const res = await fetch(`${REST}/channels/${encodeURIComponent(channel)}/messages`, {
      method: 'POST',
      headers: { authorization: auth(), 'content-type': 'application/json' },
      body: JSON.stringify({ name, data: JSON.stringify(data) }),
    })
    if (!res.ok) console.error('Ably publish', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (err) {
    console.error('Ably publish falló', err)
    return false
  }
}

/** Token que SOLO permite escuchar (subscribe) el canal indicado. */
export async function subscribeToken(channel, ttlMinutes = 60) {
  if (!ablyReady()) return null
  const keyName = env('ABLY_API_KEY').split(':')[0]
  try {
    const res = await fetch(`${REST}/keys/${encodeURIComponent(keyName)}/requestToken`, {
      method: 'POST',
      headers: { authorization: auth(), 'content-type': 'application/json' },
      body: JSON.stringify({
        keyName,
        ttl: ttlMinutes * 60000,
        capability: JSON.stringify({ [channel]: ['subscribe'] }),
        timestamp: Date.now(),
        nonce: sha256(Math.random() + String(Date.now())).slice(0, 24),
      }),
    })
    if (!res.ok) {
      console.error('Ably token', res.status, await res.text().catch(() => ''))
      return null
    }
    const d = await res.json()
    return { token: d.token, expires: d.expires, channel, host: sseHost() }
  } catch (err) {
    console.error('Ably token falló', err)
    return null
  }
}
