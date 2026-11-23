// Conecta los carruseles y las fotos ampliables (data-zoomable) con el visor
// a pantalla completa. Al abrir, la imagen "vuela" desde su miniatura hasta
// el centro de la pantalla con un zoom; al cerrar, hace el camino inverso.
import { Carousel } from './carousel'

const OPEN_MS = 420
const CLOSE_MS = 340
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'

/** Rectángulo de la parte VISIBLE de una imagen (descuenta padding y bandas de object-fit: contain). */
function visibleRect(img: HTMLImageElement): DOMRect {
  const r = img.getBoundingClientRect()
  const cs = getComputedStyle(img)
  const pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)
  const pr = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth)
  const pt = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth)
  const pb = parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth)
  let x = r.left + pl
  let y = r.top + pt
  let w = r.width - pl - pr
  let h = r.height - pt - pb

  if (cs.objectFit === 'contain' && img.naturalWidth && img.naturalHeight) {
    const ratio = img.naturalWidth / img.naturalHeight
    if (w / h > ratio) {
      const cw = h * ratio
      x += (w - cw) / 2
      w = cw
    } else {
      const ch = w / ratio
      y += (h - ch) / 2
      h = ch
    }
  }
  return new DOMRect(x, y, w, h)
}

/** ¿La miniatura está a la vista? Si no, la animación es solo un fade. */
function isOnScreen(r: DOMRect) {
  return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth
}

/** Transform que lleva la imagen del visor (to) a la posición y tamaño de la miniatura (from). */
function flipTransform(from: DOMRect, to: DOMRect) {
  const scale = Math.min(from.width / to.width, from.height / to.height)
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  return `translate(${dx}px, ${dy}px) scale(${scale})`
}

async function waitForImage(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth) return
  try {
    await img.decode()
  } catch {
    /* si falla la decodificación seguimos igual */
  }
}

interface Source {
  /** Devuelve la miniatura que corresponde a la foto i (para animar desde/hacia ella). */
  thumb: (i: number) => HTMLImageElement | null
  /** Se llama al cerrar con la foto en la que quedó el visor. */
  onClose?: (i: number) => void
  focusEl: HTMLElement
}

export function initGallery() {
  const lightbox = document.getElementById('lightbox')
  if (!lightbox) return () => {}
  // Se mueve al <body>: dentro de una sección con transform, "position: fixed"
  // deja de cubrir toda la pantalla (sobre todo en el celular).
  if (lightbox.parentElement !== document.body) document.body.appendChild(lightbox)

  const lbCarouselEl = lightbox.querySelector<HTMLElement>('[data-lightbox-carousel]')!
  const lbTrack = lightbox.querySelector<HTMLElement>('[data-carousel-track]')!
  const lbTitle = lightbox.querySelector<HTMLElement>('[data-lightbox-title]')
  const lbCounter = lightbox.querySelector<HTMLElement>('[data-lightbox-counter]')
  const backdrop = lightbox.querySelector<HTMLElement>('[data-lightbox-backdrop]')
  const chrome = lightbox.querySelectorAll<HTMLElement>('[data-lightbox-chrome]')
  const navButtons = lightbox.querySelectorAll<HTMLElement>('[data-carousel-prev], [data-carousel-next]')

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let lbCarousel: Carousel | null = null
  let source: Source | null = null
  let animating = false

  const updateCounter = (i: number) => {
    if (lbCounter && lbCarousel) lbCounter.textContent = `${i + 1} / ${lbCarousel.count}`
  }

  const fadeChrome = (show: boolean, ms: number) => {
    const frames = show ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }]
    backdrop?.animate(frames, { duration: ms, easing: 'ease', fill: 'forwards' })
    chrome.forEach((el) => el.animate(frames, { duration: ms * 0.8, delay: show ? ms * 0.35 : 0, easing: 'ease', fill: 'both' }))
  }

  async function openLightbox(images: string[], start: number, title: string, src: Source) {
    if (animating || !lightbox!.hidden) return
    animating = true
    source = src

    lbTrack.innerHTML = images
      .map(
        (url, i) => `
        <div class="carousel-slide">
          <img src="${url}" alt="${title} - imagen ${i + 1}" draggable="false" decoding="async" />
        </div>`
      )
      .join('')
    if (lbTitle) lbTitle.textContent = title
    navButtons.forEach((b) => (b.hidden = images.length < 2))
    if (lbCounter) lbCounter.hidden = images.length < 2

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

    lightbox!.hidden = false
    document.documentElement.style.overflow = 'hidden'
    lbCarouselEl.focus({ preventScroll: true })

    const target = lbTrack.children[start]?.querySelector('img') as HTMLImageElement | null
    const thumb = src.thumb(start)
    const fromRect = thumb ? visibleRect(thumb) : null

    if (reduceMotion() || !target) {
      fadeChrome(true, reduceMotion() ? 1 : 250)
      animating = false
      return
    }

    target.style.opacity = '0'
    await waitForImage(target)
    target.style.opacity = ''
    const toRect = target.getBoundingClientRect()

    fadeChrome(true, OPEN_MS)
    if (fromRect && isOnScreen(fromRect) && toRect.width) {
      // Zoom desde la miniatura: la miniatura se oculta para que parezca que "sale volando"
      if (thumb) thumb.style.visibility = 'hidden'
      const anim = target.animate(
        [
          { transform: flipTransform(fromRect, toRect), borderRadius: '1.5rem' },
          { transform: 'none', borderRadius: '0.5rem' },
        ],
        { duration: OPEN_MS, easing: EASE_OUT }
      )
      await anim.finished.catch(() => {})
      if (thumb) thumb.style.visibility = ''
    } else {
      await target
        .animate([{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }], { duration: OPEN_MS, easing: EASE_OUT })
        .finished.catch(() => {})
    }
    animating = false
  }

  async function closeLightbox() {
    if (animating || lightbox!.hidden || !lbCarousel) return
    animating = true
    const index = lbCarousel.index
    // El carrusel de la tarjeta se pone en la foto que estabas viendo, así volvemos a ella
    source?.onClose?.(index)

    const current = lbTrack.children[index]?.querySelector('img') as HTMLImageElement | null
    const thumb = source?.thumb(index) ?? null
    const fromRect = current?.getBoundingClientRect()
    const toRect = thumb ? visibleRect(thumb) : null

    if (!reduceMotion() && current && fromRect) {
      fadeChrome(false, CLOSE_MS)
      if (toRect && isOnScreen(toRect)) {
        if (thumb) thumb.style.visibility = 'hidden'
        await current
          .animate(
            [
              { transform: 'none', borderRadius: '0.5rem' },
              { transform: flipTransform(toRect, fromRect), borderRadius: '1.5rem' },
            ],
            { duration: CLOSE_MS, easing: EASE_IN_OUT, fill: 'forwards' }
          )
          .finished.catch(() => {})
        if (thumb) thumb.style.visibility = ''
      } else {
        await current
          .animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.9)' }], { duration: CLOSE_MS, easing: 'ease', fill: 'forwards' })
          .finished.catch(() => {})
      }
    }

    lightbox!.hidden = true
    document.documentElement.style.overflow = ''
    backdrop?.getAnimations().forEach((a) => a.cancel())
    chrome.forEach((el) => el.getAnimations().forEach((a) => a.cancel()))
    lbCarousel.destroy()
    lbCarousel = null
    lbTrack.innerHTML = ''
    source?.focusEl.focus({ preventScroll: true })
    source = null
    animating = false
  }

  const onKey = (e: KeyboardEvent) => {
    if (lightbox.hidden) return
    if (e.key === 'Escape') closeLightbox()
    // Las flechas funcionan aunque el foco esté en otro botón del visor
    if (e.target === lbCarouselEl) return
    if (e.key === 'ArrowRight') lbCarousel?.next()
    if (e.key === 'ArrowLeft') lbCarousel?.prev()
  }
  document.addEventListener('keydown', onKey)

  const closeButtons = lightbox.querySelectorAll('[data-lightbox-close]')
  const onCloseClick = () => closeLightbox()
  closeButtons.forEach((btn) => btn.addEventListener('click', onCloseClick))

  // ── Carruseles de las tarjetas de proyectos ──
  const carousels: Carousel[] = []
  document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((root) => {
    const images: string[] = JSON.parse(root.dataset.images || '[]')
    const title = root.dataset.title || ''
    const track = root.querySelector<HTMLElement>('[data-carousel-track]')
    const src: Source = {
      thumb: (i) => track?.children[i]?.querySelector('img') ?? null,
      onClose: (i) => carousel.goTo(i, false),
      focusEl: root,
    }
    const carousel: Carousel = new Carousel(root, {
      autoplay: true,
      interval: 4000,
      onSlideClick: (i) => {
        if (images.length) openLightbox(images, i, title, src)
      },
    })
    // Enter / Espacio con el foco en el carrusel también abre el visor
    root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === root && images.length) {
        e.preventDefault()
        openLightbox(images, carousel.index, title, src)
      }
    })
    carousels.push(carousel)
  })

  // ── Fotos sueltas ampliables (foto del inicio y de "Sobre mí") ──
  document.querySelectorAll<HTMLImageElement>('img[data-zoomable]').forEach((img) => {
    img.tabIndex = 0
    img.setAttribute('role', 'button')
    img.setAttribute('aria-label', `Ver ${img.alt} en pantalla completa`)
    const open = () =>
      openLightbox([img.currentSrc || img.src], 0, img.dataset.zoomTitle || img.alt, {
        thumb: () => img,
        focusEl: img,
      })
    img.addEventListener('click', open)
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        open()
      }
    })
  })

  return () => {
    if (!lightbox.hidden) {
      lightbox.hidden = true
      document.documentElement.style.overflow = ''
    }
    lbCarousel?.destroy()
    carousels.forEach((c) => c.destroy())
    document.removeEventListener('keydown', onKey)
    closeButtons.forEach((btn) => btn.removeEventListener('click', onCloseClick))
  }
}
