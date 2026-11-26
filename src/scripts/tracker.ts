// ─────────────────────────────────────────────────────────────
// Registro anónimo de la visita para el panel privado.
// - Avisa una vez por visita (no en cada recarga) → /api/visita
// - Va sumando: tiempo activo, secciones en orden, proyectos vistos,
//   imágenes abiertas y botones tocados → /api/visita/fin
// - Nunca corre en desarrollo ni para el dueño (/?yo=1)
// ─────────────────────────────────────────────────────────────

const SECTION_NAMES: Record<string, string> = {
  top: 'Inicio',
  experiencia: 'Experiencia',
  proyectos: 'Proyectos',
  'sobre-mi': 'Sobre mí',
}

interface Trail {
  secciones: string[]
  proyectos: string[]
  imagenes: string[]
  clicks: string[]
}

let started = false

export function initTracker() {
  if (started) return // View Transitions: el registro sigue vivo entre páginas
  try {
    if (import.meta.env.DEV) return
    if (localStorage.getItem('pf-owner') === '1') return
  } catch {
    return
  }
  started = true

  const trail: Trail = { secciones: [], proyectos: [], imagenes: [], clicks: [] }
  let key: string | null = null
  let activeMs = 0
  let visibleSince: number | null = document.visibilityState === 'visible' ? performance.now() : null
  let dirty = false
  let lastSent = ''

  const add = (list: string[], value: string) => {
    if (!value || list.includes(value) || list.length >= 40) return
    list.push(value.slice(0, 80))
    dirty = true
  }
  const seconds = () => Math.round((activeMs + (visibleSince !== null ? performance.now() - visibleSince : 0)) / 1000)

  const payload = () => JSON.stringify({ key, duracion: seconds(), ...trail })

  const send = (useBeacon = false) => {
    if (!key) return
    const body = payload()
    if (body === lastSent) return
    lastSent = body
    dirty = false
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/visita/fin', new Blob([body], { type: 'application/json' }))
    } else {
      fetch('/api/visita/fin', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body }).catch(() => {})
    }
  }

  // ── Alta de la visita (una por sesión del navegador) ──
  try {
    key = sessionStorage.getItem('pf-visit-key')
  } catch {}
  if (!key) {
    fetch('/api/visita', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: location.pathname,
        referrer: document.referrer,
        lang: navigator.language,
        screen: `${screen.width}x${screen.height}`,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.key) return
        key = d.key
        try { sessionStorage.setItem('pf-visit-key', d.key) } catch {}
        if (dirty) send()
      })
      .catch(() => {})
  }

  // ── Tiempo activo (solo cuenta con la pestaña visible) ──
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (visibleSince !== null) activeMs += performance.now() - visibleSince
      visibleSince = null
      send(true)
    } else {
      visibleSince = performance.now()
    }
  })
  window.addEventListener('pagehide', () => send(true))
  window.setInterval(() => { if (document.visibilityState === 'visible') send() }, 20000)

  // ── Imágenes abiertas en el visor ──
  document.addEventListener('pf:image-open', (e) => add(trail.imagenes, (e as CustomEvent).detail?.title ?? ''))

  // ── Botones y links tocados ──
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]')
    if (!a) return
    if (a.dataset.track) return add(trail.clicks, a.dataset.track)
    const href = a.getAttribute('href') ?? ''
    if (href.startsWith('mailto:')) return add(trail.clicks, 'Mail')
    try {
      const url = new URL(href, location.href)
      if (url.host !== location.host) add(trail.clicks, url.hostname.replace(/^www\./, ''))
    } catch {}
  }, { capture: true })

  observePage(trail, add)
  document.addEventListener('astro:page-load', () => observePage(trail, add))
}

let observers: IntersectionObserver[] = []

/** Secciones (en el orden en que las vio) y proyectos que estuvieron en pantalla. */
function observePage(trail: Trail, add: (list: string[], value: string) => void) {
  observers.forEach((o) => o.disconnect())
  // Una sección cuenta cuando cruza el centro de la pantalla (sirve aunque sea más alta que la pantalla)
  const sections = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && add(trail.secciones, SECTION_NAMES[e.target.id] ?? e.target.id)),
    { rootMargin: '-45% 0px -45% 0px' }
  )
  // Un proyecto cuenta cuando se ve al menos la mitad de su tarjeta
  const projects = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        add(trail.proyectos, e.target.querySelector('h3')?.childNodes[0]?.textContent?.trim() ?? '')
      }),
    { threshold: 0.5 }
  )
  document.querySelectorAll('section[id]').forEach((el) => sections.observe(el))
  document.querySelectorAll('.project-card').forEach((el) => projects.observe(el))
  observers = [sections, projects]
}
