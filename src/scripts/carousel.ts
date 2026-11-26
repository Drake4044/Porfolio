// ─────────────────────────────────────────────────────────────
// Carrusel reutilizable: autoplay, swipe (mouse/touch), botones,
// puntos, teclado y apertura del visor a pantalla completa.
// Se usa tanto en las tarjetas de proyectos como en el lightbox.
// ─────────────────────────────────────────────────────────────

interface CarouselOptions {
  autoplay?: boolean
  interval?: number
  onSlideClick?: (index: number, event: PointerEvent) => void
  onChange?: (index: number) => void
}

const SWIPE_THRESHOLD = 50 // px mínimos para considerar un swipe
const CLICK_TOLERANCE = 6 // px de movimiento que aún cuentan como click
const RESUME_DELAY = 6000 // ms que espera el autoplay tras una interacción

export class Carousel {
  private root: HTMLElement
  private viewport: HTMLElement
  private track: HTMLElement
  private dotsContainer: HTMLElement | null
  private opts: Required<Omit<CarouselOptions, 'onSlideClick' | 'onChange'>> & CarouselOptions

  index = 0
  private timer: number | null = null
  private resumeTimer: number | null = null
  private isVisible = false
  private isHovered = false
  private dragging = false
  private startX = 0
  private startY = 0
  private deltaX = 0
  private axis: 'x' | 'y' | null = null
  private pointerId: number | null = null
  private cleanup: Array<() => void> = []

  constructor(root: HTMLElement, options: CarouselOptions = {}) {
    this.root = root
    this.viewport = root.querySelector('[data-carousel-viewport]') as HTMLElement
    this.track = root.querySelector('[data-carousel-track]') as HTMLElement
    this.dotsContainer = root.querySelector('[data-carousel-dots]')
    this.opts = { autoplay: true, interval: 4000, ...options }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) this.opts.autoplay = false

    this.bind()
    this.renderDots()
    this.goTo(0, false)
  }

  get count() {
    return this.track.children.length
  }

  /** Reconstruye los puntos (útil en el lightbox, que cambia de imágenes). */
  renderDots() {
    if (!this.dotsContainer) return
    this.dotsContainer.innerHTML = ''
    if (this.count < 2) return
    for (let i = 0; i < this.count; i++) {
      const dot = document.createElement('button')
      dot.type = 'button'
      dot.className = 'carousel-dot'
      dot.setAttribute('aria-label', `Ir a la imagen ${i + 1}`)
      dot.addEventListener('click', (e) => {
        e.stopPropagation()
        this.goTo(i)
        this.userInteracted()
      })
      this.dotsContainer.appendChild(dot)
    }
  }

  goTo(i: number, animate = true) {
    const n = this.count
    if (n === 0) return
    this.index = ((i % n) + n) % n // da la vuelta en ambos sentidos
    this.track.style.transition = animate ? '' : 'none'
    this.track.style.transform = `translateX(${-this.index * 100}%)`
    if (!animate) {
      // fuerza el reflow para que la próxima transición sí se anime
      void this.track.offsetWidth
      this.track.style.transition = ''
    }
    this.dotsContainer?.querySelectorAll('.carousel-dot').forEach((d, idx) => {
      d.classList.toggle('active', idx === this.index)
      d.setAttribute('aria-current', idx === this.index ? 'true' : 'false')
    })
    Array.from(this.track.children).forEach((slide, idx) => {
      slide.setAttribute('aria-hidden', idx === this.index ? 'false' : 'true')
    })
    this.opts.onChange?.(this.index)
  }

  next = () => this.goTo(this.index + 1)
  prev = () => this.goTo(this.index - 1)

  // ── Autoplay ──────────────────────────────────────────────
  private canPlay() {
    return (
      this.opts.autoplay &&
      this.count > 1 &&
      this.isVisible &&
      !this.isHovered &&
      !this.dragging &&
      this.resumeTimer === null &&
      document.visibilityState === 'visible'
    )
  }

  private syncAutoplay() {
    if (this.canPlay()) {
      if (this.timer === null) this.timer = window.setInterval(this.next, this.opts.interval)
    } else if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /** Tras tocar un botón o deslizar, el autoplay espera un rato y retoma solo. */
  private userInteracted() {
    if (this.resumeTimer !== null) clearTimeout(this.resumeTimer)
    this.resumeTimer = window.setTimeout(() => {
      this.resumeTimer = null
      this.syncAutoplay()
    }, RESUME_DELAY)
    this.syncAutoplay()
  }

  setVisible(visible: boolean) {
    this.isVisible = visible
    this.syncAutoplay()
  }

  // ── Eventos ───────────────────────────────────────────────
  private on<K extends keyof HTMLElementEventMap>(
    el: EventTarget,
    type: K | string,
    fn: (e: any) => void,
    opts?: AddEventListenerOptions
  ) {
    el.addEventListener(type, fn, opts)
    this.cleanup.push(() => el.removeEventListener(type, fn, opts))
  }

  private bind() {
    const prevBtn = this.root.querySelector('[data-carousel-prev]')
    const nextBtn = this.root.querySelector('[data-carousel-next]')
    if (prevBtn) this.on(prevBtn, 'click', (e) => { e.stopPropagation(); this.prev(); this.userInteracted() })
    if (nextBtn) this.on(nextBtn, 'click', (e) => { e.stopPropagation(); this.next(); this.userInteracted() })

    // Pausa al pasar el mouse (solo en dispositivos con puntero real)
    this.on(this.root, 'pointerenter', (e: PointerEvent) => {
      if (e.pointerType === 'mouse') { this.isHovered = true; this.syncAutoplay() }
    })
    this.on(this.root, 'pointerleave', (e: PointerEvent) => {
      if (e.pointerType === 'mouse') { this.isHovered = false; this.syncAutoplay() }
    })

    // Flechas del teclado cuando el carrusel tiene el foco
    this.on(this.root, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { this.next(); this.userInteracted() }
      if (e.key === 'ArrowLeft') { this.prev(); this.userInteracted() }
    })

    // Swipe con Pointer Events (mouse + touch + lápiz con el mismo código)
    this.on(this.viewport, 'pointerdown', this.onPointerDown)
    this.on(this.viewport, 'pointermove', this.onPointerMove)
    this.on(this.viewport, 'pointerup', this.onPointerUp)
    this.on(this.viewport, 'pointercancel', this.onPointerUp)
    this.on(this.viewport, 'dragstart', (e: Event) => e.preventDefault())

    this.on(document, 'visibilitychange', () => this.syncAutoplay())

    // Solo corre el autoplay mientras el carrusel está en pantalla
    const io = new IntersectionObserver(
      ([entry]) => this.setVisible(entry.isIntersecting),
      { threshold: 0.35 }
    )
    io.observe(this.root)
    this.cleanup.push(() => io.disconnect())
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || this.count === 0) return
    if ((e.target as HTMLElement).closest('button')) return
    this.dragging = true
    this.pointerId = e.pointerId
    this.startX = e.clientX
    this.startY = e.clientY
    this.deltaX = 0
    this.axis = null
    this.track.style.transition = 'none'
    this.syncAutoplay()
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging || e.pointerId !== this.pointerId) return
    const dx = e.clientX - this.startX
    const dy = e.clientY - this.startY

    // Decide si el gesto es horizontal (carrusel) o vertical (scroll de la página)
    if (this.axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      this.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (this.axis === 'x') {
        this.viewport.setPointerCapture(e.pointerId)
        this.root.classList.add('is-dragging')
      }
    }
    if (this.axis !== 'x') return

    // Resistencia en los extremos para que se sienta natural
    const atEdge = (this.index === 0 && dx > 0) || (this.index === this.count - 1 && dx < 0)
    this.deltaX = atEdge ? dx * 0.35 : dx
    this.track.style.transform = `translateX(calc(${-this.index * 100}% + ${this.deltaX}px))`
  }

  private onPointerUp = (e: PointerEvent) => {
    if (!this.dragging || e.pointerId !== this.pointerId) return
    this.dragging = false
    this.root.classList.remove('is-dragging')
    if (this.viewport.hasPointerCapture(e.pointerId)) this.viewport.releasePointerCapture(e.pointerId)
    this.track.style.transition = ''

    const moved = Math.abs(e.clientX - this.startX) + Math.abs(e.clientY - this.startY)
    if (e.type === 'pointerup' && this.axis === null && moved < CLICK_TOLERANCE) {
      // Fue un click/tap: abre la imagen a pantalla completa
      this.goTo(this.index)
      this.opts.onSlideClick?.(this.index, e)
      return
    }

    if (this.axis === 'x' && Math.abs(this.deltaX) > SWIPE_THRESHOLD) {
      this.deltaX < 0 ? this.next() : this.prev()
    } else {
      this.goTo(this.index) // vuelve a su lugar
    }
    this.userInteracted()
  }

  destroy() {
    if (this.timer !== null) clearInterval(this.timer)
    if (this.resumeTimer !== null) clearTimeout(this.resumeTimer)
    this.cleanup.forEach((fn) => fn())
    this.cleanup = []
  }
}
