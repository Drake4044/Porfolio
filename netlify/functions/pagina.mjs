// ─────────────────────────────────────────────────────────────
// Dirección secreta del panel.
// Atiende cualquier dirección de un solo tramo que NO sea una página real del
// sitio (las páginas reales tienen prioridad gracias a preferStatic).
// Si coincide con la variable de entorno PANEL_PATH, muestra el panel;
// si no, responde "página no encontrada". La palabra secreta no está en el código.
// ─────────────────────────────────────────────────────────────
import panelHtml from './_shared/panel-html.mjs'
import { env, safeEqual } from './_shared/util.mjs'

const SECURITY_HEADERS = {
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'content-security-policy':
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' https://main.realtime.ably.net; img-src 'self' data:; form-action 'none'; frame-ancestors 'none'; base-uri 'none'",
}

const notFound = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página no encontrada</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#e5e7eb;font:16px system-ui,sans-serif;text-align:center}a{color:#facc15}</style></head>
<body><main><h1>404</h1><p>Esta página no existe.</p><p><a href="/">Volver al inicio</a></p></main></body></html>`

export default async (req, context) => {
  const slug = String(context?.params?.slug ?? new URL(req.url).pathname.slice(1))
  const secret = env('PANEL_PATH')
  if (secret && secret.length >= 6 && safeEqual(slug, secret)) {
    return new Response(panelHtml, { headers: { 'content-type': 'text/html; charset=utf-8', ...SECURITY_HEADERS } })
  }
  return new Response(notFound, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}

export const config = { path: '/:slug', preferStatic: true, method: ['GET', 'HEAD'] }
