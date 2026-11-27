// ─────────────────────────────────────────────────────────────
// Contador de visitas estilo tragamonedas.
// - Cada carga o recarga de la página suma 1 (POST /api/vista)
// - Escucha el canal público de Ably para actualizarse en vivo
// ─────────────────────────────────────────────────────────────

const STRIP_CYCLES = 4 // cada rodillo tiene los dígitos 0-9 repetidos 4 veces
const DIGIT_HEIGHT_EM = 1.25

interface Reel {
  el: HTMLElement
  strip: HTMLElement
  pos: number // índice actual dentro de la tira (0 .. 10*STRIP_CYCLES-1)
}

let reels: Reel[] = []
let current = -1
let revealed = false // ¿ya se mostró en pantalla?
let source: EventSource | null = null
let renewTimer: number | null = null

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const fmt = (n: number) => new Intl.NumberFormat('es-AR').format(n)

function makeReel(): Reel {
  const el = document.createElement('span')
  el.className = 'reel'
  const strip = document.createElement('span')
  strip.className = 'reel-strip'
  for (let c = 0; c < STRIP_CYCLES; c++) {
    for (let d = 0; d < 10; d++) {
      const s = document.createElement('span')
      s.textContent = String(d)
      strip.appendChild(s)
    }
  }
  el.appendChild(strip)
  return { el, strip, pos: 0 }
}

function setPos(reel: Reel, pos: number, ms: number, delay = 0) {
  reel.strip.style.transition = ms ? `transform ${ms}ms cubic-bezier(0.3, 0.1, 0.2, 1.04) ${delay}ms` : 'none'
  reel.strip.style.transform = `translateY(${-pos * DIGIT_HEIGHT_EM}em)`
  reel.pos = pos
}

/** Arma los rodillos para la cantidad de dígitos del número (con separador de miles). */
function build(container: HTMLElement, text: string) {
  container.innerHTML = ''
  reels = []
  for (const ch of text) {
    if (/\d/.test(ch)) {
      const reel = makeReel()
      container.appendChild(reel.el)
      reels.push(reel)
    } else {
      const sep = document.createElement('span')
      sep.className = 'reel-sep'
      sep.textContent = ch
      container.appendChild(sep)
    }
  }
}

function show(total: number, first: boolean) {
  const container = document.querySelector<HTMLElement>('[data-counter]')
  if (!container) return
  const text = fmt(total)
  const digits = text.replace(/\D/g, '')
  container.setAttribute('aria-label', `${text} visitas`)

  const rebuild = first || reels.length !== digits.length
  if (rebuild) build(container, text)
  const instant = reduceMotion()

  reels.forEach((reel, i) => {
    const d = Number(digits[i])
    if (rebuild) {
      // Primera vez: todos los rodillos giran varias vueltas y frenan escalonados, de izquierda a derecha
      setPos(reel, 0, 0)
      void reel.strip.offsetHeight
      const target = instant ? d : 10 * (STRIP_CYCLES - 1) + d
      requestAnimationFrame(() => setPos(reel, target, instant ? 0 : 1900 + i * 260))
      return
    }
    const currentDigit = reel.pos % 10
    if (currentDigit === d) return
    // Siguiente vuelta: avanza siempre hacia adelante una vuelta completa hasta el nuevo dígito
    let base = reel.pos
    if (base > 10 * (STRIP_CYCLES - 2)) {
      base = base % 10 // vuelve al principio sin que se note (mismo dígito)
      setPos(reel, base, 0)
      void reel.strip.offsetHeight
    }
    const target = base + 10 + ((d - (base % 10) + 10) % 10)
    requestAnimationFrame(() => setPos(reel, target, instant ? 0 : 1400))
    reel.el.classList.remove('win')
    void reel.el.offsetWidth
    reel.el.classList.add('win')
  })
  current = total
}

interface Live { token: string; channel: string; host: string; expires: number }

function listen(live: Live | null) {
  source?.close()
  source = null
  if (renewTimer) clearTimeout(renewTimer)
  const badge = document.querySelector<HTMLElement>('[data-counter-live]')
  if (!live) return
  const url = `${live.host}/sse?v=1.2&channels=${encodeURIComponent(live.channel)}&accessToken=${encodeURIComponent(live.token)}`
  const es = new EventSource(url)
  source = es
  es.onopen = () => { if (badge) badge.hidden = false }
  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data
      if (typeof data?.total !== 'number' || data.total <= current) return
      if (revealed) show(data.total, false)
      else current = data.total // todavía no está a la vista: se muestra al llegar
    } catch {}
  }
  es.addEventListener('error', (e) => {
    if (source !== es) return
    if (badge) badge.hidden = true
    if ((e as MessageEvent).data || es.readyState === 2) {
      es.close()
      source = null
      renewTimer = window.setTimeout(refreshToken, 5000)
    }
  })
  // Renueva el permiso antes de que venza
  renewTimer = window.setTimeout(refreshToken, Math.max(60000, live.expires - Date.now() - 120000))
}

function refreshToken() {
  fetch('/api/vista/token')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => listen(d?.live ?? null))
    .catch(() => {})
}

let started = false
export function initCounter() {
  const container = document.querySelector<HTMLElement>('[data-counter]')
  if (!container) return
  if (started && current >= 0) {
    // Volvió a esta página con View Transitions: se redibuja sin volver a sumar
    show(current, true)
    return
  }
  started = true
  if (import.meta.env.DEV) {
    revealed = true
    show(1234, true)
    return
  }
  // Empieza a girar recién cuando el contador aparece en pantalla
  const run = (total: number) => {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      revealed = true
      show(Math.max(total, current), true)
    }, { threshold: 0.4 })
    io.observe(container)
  }
  fetch('/api/vista', { method: 'POST' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (typeof d?.total !== 'number') return
      current = d.total
      run(d.total)
      listen(d.live)
    })
    .catch(() => {})
}
