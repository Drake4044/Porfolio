// Conecta todos los carruseles de la página con el visor a pantalla completa.
import { Carousel } from './carousel'

export function initGallery() {
  const lightbox = document.getElementById('lightbox')
  const lbCarouselEl = lightbox?.querySelector<HTMLElement>('[data-lightbox-carousel]')
  const lbTrack = lightbox?.querySelector<HTMLElement>('[data-carousel-track]')
  const lbTitle = lightbox?.querySelector<HTMLElement>('[data-lightbox-title]')
  const lbCounter = lightbox?.querySelector<HTMLElement>('[data-lightbox-counter]')

  // El visor se mueve al <body>: si queda dentro de una sección con transform,
  // "position: fixed" deja de cubrir toda la pantalla (sobre todo en el celular).
  if (lightbox && lightbox.parentElement !== document.body) document.body.appendChild(lightbox)

  let lbCarousel: Carousel | null = null
  let returnFocus: HTMLElement | null = null
  let sourceCarousel: Carousel | null = null

  const updateCounter = (i: number) => {
    if (lbCounter && lbCarousel) lbCounter.textContent = `${i + 1} / ${lbCarousel.count}`
  }

  function openLightbox(images: string[], start: number, title: string, from: Carousel, origin: HTMLElement) {
    if (!lightbox || !lbCarouselEl || !lbTrack) return
    returnFocus = origin
    sourceCarousel = from

    lbTrack.innerHTML = images
      .map(
        (src, i) => `
        <div class="carousel-slide">
          <img src="${src}" alt="${title} - imagen ${i + 1}" draggable="false" decoding="async" />
        </div>`
      )
      .join('')
    if (lbTitle) lbTitle.textContent = title

    lbCarousel?.destroy()
    lbCarousel = new Carousel(lbCarouselEl, {
      autoplay: false,
      onChange: updateCounter,
      // Tocar fuera de la foto (en el fondo) cierra el visor
      onSlideClick: (i, e) => {
        const img = lbTrack.children[i]?.querySelector('img')
        if (!img) return
        const r = img.getBoundingClientRect()
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
        if (!inside) closeLightbox()
      },
    })
    lbCarousel.goTo(start, false)

    lightbox.hidden = false
    document.documentElement.style.overflow = 'hidden'
    lbCarouselEl.focus({ preventScroll: true })
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return
    lightbox.hidden = true
    document.documentElement.style.overflow = ''
    // El carrusel de la tarjeta queda en la última foto que viste
    if (sourceCarousel && lbCarousel) sourceCarousel.goTo(lbCarousel.index, false)
    lbCarousel?.destroy()
    lbCarousel = null
    returnFocus?.focus({ preventScroll: true })
  }

  const onKey = (e: KeyboardEvent) => {
    if (!lightbox || lightbox.hidden) return
    if (e.key === 'Escape') closeLightbox()
    // Las flechas funcionan aunque el foco esté en otro botón del visor
    if (e.target === lbCarouselEl) return
    if (e.key === 'ArrowRight') lbCarousel?.next()
    if (e.key === 'ArrowLeft') lbCarousel?.prev()
  }
  document.addEventListener('keydown', onKey)

  const closeButtons = lightbox?.querySelectorAll('[data-lightbox-close]') ?? []
  closeButtons.forEach((btn) => btn.addEventListener('click', closeLightbox))

  // Carruseles de las tarjetas de proyectos
  const carousels: Carousel[] = []
  document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((root) => {
    const images: string[] = JSON.parse(root.dataset.images || '[]')
    const title = root.dataset.title || ''
    const carousel: Carousel = new Carousel(root, {
      autoplay: true,
      interval: 4000,
      onSlideClick: (i) => {
        if (images.length) openLightbox(images, i, title, carousel, root)
      },
    })
    // Enter / Espacio con el foco en el carrusel también abre el visor
    root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === root && images.length) {
        e.preventDefault()
        openLightbox(images, carousel.index, title, carousel, root)
      }
    })
    carousels.push(carousel)
  })

  return () => {
    closeLightbox()
    carousels.forEach((c) => c.destroy())
    document.removeEventListener('keydown', onKey)
  }
}
