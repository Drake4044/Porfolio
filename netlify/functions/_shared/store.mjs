// Acceso al almacenamiento (Netlify Blobs).
// En pruebas locales (PF_MEMORY_STORE=1) usa un almacenamiento en memoria
// con la misma interfaz, para poder probar todo sin Netlify.
import { getStore } from '@netlify/blobs'

const memory = new Map()
function memoryStore(name) {
  const map = memory.get(name) ?? new Map()
  memory.set(name, map)
  let n = 0
  return {
    async get(key, opts) {
      const e = map.get(key)
      if (!e) return null
      return opts?.type === 'json' ? JSON.parse(e.v) : e.v
    },
    async getWithMetadata(key, opts) {
      const e = map.get(key)
      if (!e) return null
      return { data: opts?.type === 'json' ? JSON.parse(e.v) : e.v, etag: e.etag, metadata: {} }
    },
    async setJSON(key, data, opts = {}) {
      const e = map.get(key)
      if (opts.onlyIfNew && e) return { modified: false }
      if (opts.onlyIfMatch && (!e || e.etag !== opts.onlyIfMatch)) return { modified: false }
      const etag = `"${++n}"`
      map.set(key, { v: JSON.stringify(data), etag })
      return { modified: true, etag }
    },
    async delete(key) {
      map.delete(key)
    },
    async list({ prefix = '' } = {}) {
      return { blobs: [...map.keys()].filter((k) => k.startsWith(prefix)).sort().map((key) => ({ key, etag: map.get(key).etag })) }
    },
  }
}

const useMemory = () => process.env.PF_MEMORY_STORE === '1'

/** Visitas: una entrada por visita reciente (v/...) y paquetes por mes (m/AAAA-MM). */
export const visitas = () => (useMemory() ? memoryStore('visitas') : getStore({ name: 'portfolio-visitas', consistency: 'strong' }))
/** Ajustes y seguridad: interruptores, intentos de login, códigos. */
export const ajustes = () => (useMemory() ? memoryStore('ajustes') : getStore({ name: 'portfolio-ajustes', consistency: 'strong' }))

/** Guarda con reintentos usando ETag, para que dos escrituras a la vez no se pisen. */
export async function updateJSON(store, key, updater, { create = true, tries = 6 } = {}) {
  for (let i = 0; i < tries; i++) {
    const current = await store.getWithMetadata(key, { type: 'json' })
    if (!current && !create) return null
    const next = updater(current?.data ?? null)
    if (next === undefined) return current?.data ?? null
    const res = current
      ? await store.setJSON(key, next, { onlyIfMatch: current.etag })
      : await store.setJSON(key, next, { onlyIfNew: true })
    if (res.modified) return next
    await new Promise((r) => setTimeout(r, 40 * (i + 1)))
  }
  throw new Error(`No se pudo actualizar ${key}`)
}

export const DEFAULT_CONFIG = { telegram: true, email: true }
export async function getConfig() {
  const c = await ajustes().get('config', { type: 'json' })
  return { ...DEFAULT_CONFIG, ...(c ?? {}) }
}
