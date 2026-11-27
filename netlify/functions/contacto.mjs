// ─────────────────────────────────────────────────────────────
// Formulario de contacto.
//   POST /api/contacto  { nombre, email, empresa, motivo, mensaje }
// Guarda el mensaje para el panel y te avisa por Telegram, mail y en vivo.
// Anti-spam: campo trampa invisible, tiempo mínimo de llenado y límite por hora.
// ─────────────────────────────────────────────────────────────
import { mensajes, ajustes, updateJSON } from './_shared/store.mjs'
import { sendTelegram, sendEmail } from './_shared/notify.mjs'
import { publish, panelChannel } from './_shared/ably.mjs'
import { json, clean, randomId, ipTag, fechaAR, BOT_PATTERN } from './_shared/util.mjs'

const MOTIVOS = ['Oferta de trabajo', 'Proyecto freelance', 'Otro']
const MAX_PER_HOUR = 3
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/
const KEY_RE = /^v\/\d{13}-[a-z0-9]{12}$/

export default async (req, context) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const ua = req.headers.get('user-agent') ?? ''
  if (!ua || BOT_PATTERN.test(ua)) return json({ error: 'No se pudo enviar.' }, 400)

  let d
  try {
    const text = await req.text()
    if (text.length > 8000) return json({ error: 'El mensaje es demasiado largo.' }, 413)
    d = JSON.parse(text || '{}')
  } catch {
    return json({ error: 'No se pudo enviar.' }, 400)
  }

  // Trampas para robots: si completó el campo invisible o tardó menos de 3 s, se descarta en silencio
  if (d.sitio || Number(d.tiempo) < 3000) return json({ ok: true })

  const msg = {
    nombre: clean(d.nombre, 80),
    email: clean(d.email, 160),
    empresa: clean(d.empresa, 100),
    motivo: MOTIVOS.includes(d.motivo) ? d.motivo : 'Otro',
    mensaje: String(d.mensaje ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, 3000),
    visita: KEY_RE.test(String(d.visita ?? '')) ? d.visita : '',
  }
  if (msg.nombre.length < 2) return json({ error: 'Escribí tu nombre.' }, 400)
  if (!EMAIL_RE.test(msg.email)) return json({ error: 'Revisá tu mail.' }, 400)
  if (msg.mensaje.length < 10) return json({ error: 'El mensaje es muy corto.' }, 400)

  // Límite por conexión: 3 mensajes por hora
  let allowed = true
  const hour = new Date().toISOString().slice(0, 13)
  await updateJSON(ajustes(), `contacto/${ipTag(context, req)}/${hour}`, (c) => {
    const count = (c?.count ?? 0) + 1
    allowed = count <= MAX_PER_HOUR
    return { count }
  }).catch(() => {})
  if (!allowed) return json({ error: 'Ya enviaste varios mensajes. Probá de nuevo en un rato o escribime por mail.' }, 429)

  const now = Date.now()
  const id = randomId()
  const record = { id, key: `c/${now}-${id}`, fecha: new Date(now).toISOString(), leido: false, ...msg }
  await mensajes().setJSON(record.key, record)

  const text = [
    '✉️ Nuevo mensaje desde tu portfolio',
    '',
    `👤 ${msg.nombre}${msg.empresa ? ` · ${msg.empresa}` : ''}`,
    `📧 ${msg.email}`,
    `📌 ${msg.motivo}`,
    `🕒 ${fechaAR(new Date(now))}`,
    '',
    msg.mensaje,
  ].join('\n')
  // Los mensajes siempre te avisan (los interruptores del panel son para las visitas)
  await Promise.all([
    sendTelegram(text),
    sendEmail(`✉️ ${msg.motivo}: ${msg.nombre}${msg.empresa ? ` (${msg.empresa})` : ''}`, text, msg.email),
    publish(panelChannel(), 'mensaje', { tipo: 'mensaje', mensaje: record }),
  ])
  return json({ ok: true })
}

export const config = { path: '/api/contacto' }
