// HTML del panel privado (una sola página, sin dependencias externas).
// Todo dato que viene de visitantes se escapa antes de mostrarse.
// Nota: el código del navegador no usa template literals para poder vivir dentro de String.raw.
export default String.raw`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>·</title>
<style>
  :root {
    --bg: #07070c; --card: #11111b; --card2: #171726; --line: #26263a; --text: #e5e7eb; --muted: #9ca3af;
    --yellow: #facc15; --violet: #7c5cf0; --green: #22c55e; --red: #ef4444; --radius: 14px;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  body { background: radial-gradient(120% 80% at 50% -10%, #1b1340 0%, var(--bg) 55%) fixed; min-height: 100vh; }
  button, input, select, textarea { font: inherit; color: inherit; }
  button { cursor: pointer; }
  [hidden] { display: none !important; }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 20px 16px 60px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 14px; margin: 0 0 12px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--card2); transition: .2s; white-space: nowrap; text-decoration: none; }
  .btn:hover { border-color: var(--yellow); color: var(--yellow); }
  .btn.primary { background: var(--yellow); color: #111; border-color: var(--yellow); font-weight: 700; }
  .btn.primary:hover { filter: brightness(1.08); color: #111; }
  .btn.danger { background: rgb(239 68 68 / .12); border-color: rgb(239 68 68 / .5); color: #fca5a5; }
  .btn.danger:hover { background: var(--red); color: #fff; border-color: var(--red); }
  .btn.small { padding: 4px 10px; font-size: 13px; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  input, select, textarea { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--line); background: #0c0c14; outline: none; }
  input:focus, select:focus { border-color: var(--violet); box-shadow: 0 0 0 3px rgb(124 92 240 / .25); }
  input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--yellow); cursor: pointer; padding: 0; }
  label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
  .muted { color: var(--muted); }
  .error { color: #fca5a5; min-height: 1.5em; font-size: 14px; margin: 0; }

  /* Login */
  .login { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
  .login .card { width: 100%; max-width: 360px; padding: 28px; display: grid; gap: 14px; box-shadow: 0 30px 80px rgb(0 0 0 / .5); }
  .pass-wrap { position: relative; }
  .pass-wrap input { padding-right: 44px; }
  .eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; border: 0; background: none; color: var(--muted); display: grid; place-items: center; border-radius: 8px; }
  .eye:hover { color: var(--yellow); background: rgb(255 255 255 / .06); }
  .eye svg { width: 20px; height: 20px; }
  .code-input { text-align: center; font-size: 28px; letter-spacing: .5em; padding-left: .5em; font-variant-numeric: tabular-nums; }

  /* Panel */
  .top { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .top .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .live { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
  .live i { width: 8px; height: 8px; border-radius: 50%; background: #6b7280; }
  .live.on i { background: var(--green); animation: pulse 1.8s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgb(34 197 94 / .6); } 70% { box-shadow: 0 0 0 8px rgb(34 197 94 / 0); } 100% { box-shadow: 0 0 0 0 rgb(34 197 94 / 0); } }
  .grid { display: grid; gap: 14px; }
  .grid > * { min-width: 0; } /* evita que la tabla ancha empuje la página en el celular */
  .kpis { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
  .kpi .v { font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; display: inline-block; transition: color .3s; }
  .kpi .v.bump { animation: bump .7s ease; color: var(--yellow); }
  @keyframes bump { 30% { transform: scale(1.18); } 100% { transform: none; } }
  .kpi .l { font-size: 13px; color: var(--muted); }
  .two { grid-template-columns: 1fr; }
  @media (min-width: 860px) { .two { grid-template-columns: 1fr 1fr; } }
  .four { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
  .filters { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); align-items: end; }
  .filters > * { min-width: 0; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text); margin: 0; cursor: pointer; padding: 9px 0; }

  /* Interruptores */
  .toggles { display: flex; flex-wrap: wrap; gap: 18px; align-items: center; }
  .switch { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 15px; color: var(--text); margin: 0; }
  .switch input { display: none; }
  .switch .track { width: 44px; height: 24px; border-radius: 99px; background: #33334a; position: relative; transition: .2s; flex: none; }
  .switch .track::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: .2s; }
  .switch input:checked + .track { background: var(--green); }
  .switch input:checked + .track::after { transform: translateX(20px); }
  .switch.off { opacity: .5; cursor: not-allowed; }

  /* Gráficos */
  .chart { width: 100%; height: 180px; display: block; }
  .chart .bar { fill: var(--violet); transition: .15s; }
  .chart .bar:hover { fill: var(--yellow); }
  .chart text { fill: var(--muted); font-size: 10px; }
  .rank { display: grid; gap: 6px; }
  .rank button { all: unset; cursor: pointer; display: grid; grid-template-columns: 1fr auto; gap: 8px; position: relative; padding: 6px 10px; border-radius: 8px; overflow: hidden; font-size: 14px; }
  .rank button:hover { outline: 1px solid var(--yellow); }
  .rank .fill { position: absolute; inset: 0 auto 0 0; background: rgb(124 92 240 / .25); border-radius: 8px; z-index: 0; }
  .rank span { position: relative; z-index: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rank .n { font-variant-numeric: tabular-nums; color: var(--muted); }

  /* Tabla */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th { font-size: 12px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
  th:first-child, td:first-child { width: 34px; padding-right: 0; }
  tbody tr { cursor: pointer; transition: background .15s; }
  tbody tr:hover { background: var(--card2); }
  tbody tr.sel { background: rgb(250 204 21 / .08); }
  tbody tr.nueva { animation: rowIn 3.5s ease; }
  @keyframes rowIn {
    0% { opacity: 0; transform: translateY(-14px); background: rgb(250 204 21 / .35); }
    12% { opacity: 1; transform: none; }
    40% { background: rgb(250 204 21 / .2); }
    100% { background: transparent; }
  }
  .pill { display: inline-block; padding: 1px 8px; border-radius: 99px; background: #23233a; font-size: 12px; }
  .pill.bot { background: rgb(148 163 184 / .15); color: #cbd5e1; }
  .pill.ref { background: rgb(124 92 240 / .2); color: #c4b5fd; }
  .bulk { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }

  /* Mensajes */
  .msgs { display: grid; gap: 10px; }
  .msg { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; background: var(--card2); }
  .msg.unread { border-color: rgb(250 204 21 / .6); box-shadow: inset 3px 0 0 var(--yellow); }
  .msg.nueva { animation: rowIn 3.5s ease; }
  .msg .head { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: baseline; justify-content: space-between; }
  .msg .body { white-space: pre-wrap; word-break: break-word; margin: 8px 0; }
  .msg .acts { display: flex; gap: 8px; flex-wrap: wrap; }
  .msg a.mail { color: var(--yellow); }
  .badge { background: var(--yellow); color: #111; border-radius: 99px; padding: 0 8px; font-size: 12px; font-weight: 700; }

  /* Ventanas */
  .modal { position: fixed; inset: 0; background: rgb(0 0 0 / .7); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 16px; z-index: 10; }
  .modal .card { width: 100%; max-width: 560px; max-height: 90vh; overflow: auto; animation: pop .2s ease; }
  @keyframes pop { from { opacity: 0; transform: scale(.96); } }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0; }
  dt { color: var(--muted); }
  dd { margin: 0; word-break: break-word; }
  .steps { display: flex; flex-wrap: wrap; gap: 6px; }
  .steps .pill { background: rgb(250 204 21 / .12); color: var(--yellow); }
  .confirm { z-index: 12; }
  .confirm .card { max-width: 420px; border-color: rgb(239 68 68 / .5); }
  .confirm h1 { font-size: 18px; }
  .confirm .acts { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }

  /* Avisos emergentes (bajan desde arriba) */
  .toasts { position: fixed; top: 14px; left: 50%; transform: translateX(-50%); z-index: 30; display: grid; gap: 8px; width: min(92vw, 420px); pointer-events: none; }
  .toast { pointer-events: auto; padding: 12px 16px; border-radius: 12px; color: #fff; font-weight: 600; box-shadow: 0 14px 40px rgb(0 0 0 / .45); animation: toastIn .45s cubic-bezier(.22,1,.36,1); }
  .toast.out { animation: toastOut .35s ease forwards; }
  .toast.ok { background: linear-gradient(135deg, #15803d, #22c55e); }
  .toast.off { background: linear-gradient(135deg, #b91c1c, #ef4444); }
  .toast.visit { background: linear-gradient(135deg, #5b3fd6, #7c5cf0); border: 1px solid rgb(250 204 21 / .7); }
  .toast small { display: block; font-weight: 400; opacity: .92; }
  @keyframes toastIn { from { opacity: 0; transform: translateY(-120%) scale(.95); } }
  @keyframes toastOut { to { opacity: 0; transform: translateY(-120%); } }
  .empty { text-align: center; padding: 40px 10px; color: var(--muted); }
  @media (max-width: 520px) { .kpi .v { font-size: 22px; } .wrap { padding: 14px 10px 50px; } .top .actions { width: 100%; } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
</style>
</head>
<body>

<!-- Paso 1: usuario y contraseña -->
<section class="login" id="v-login" hidden>
  <form class="card" id="f-login" autocomplete="on">
    <h1>Acceso</h1>
    <div><label for="user">Usuario</label><input id="user" name="username" autocomplete="username" required></div>
    <div>
      <label for="pass">Contraseña</label>
      <div class="pass-wrap">
        <input id="pass" name="password" type="password" autocomplete="current-password" required>
        <button type="button" class="eye" id="b-eye" aria-label="Mostrar contraseña" aria-pressed="false">
          <svg id="eye-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/></svg>
          <svg id="eye-off" hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.585 10.587a2 2 0 0 0 2.829 2.828"/><path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87"/><path d="M3 3l18 18"/></svg>
        </button>
      </div>
    </div>
    <p class="error" id="e-login"></p>
    <button class="btn primary" type="submit">Continuar</button>
  </form>
</section>

<!-- Paso 2: código por Telegram / mail -->
<section class="login" id="v-code" hidden>
  <form class="card" id="f-code">
    <h1>Código de seguridad</h1>
    <p class="muted" id="code-help">Te mandamos un código de 6 dígitos.</p>
    <input id="code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required>
    <p class="error" id="e-code"></p>
    <button class="btn primary" type="submit">Entrar</button>
    <button class="btn" type="button" id="b-back">Volver</button>
  </form>
</section>

<!-- Panel -->
<main class="wrap" id="v-panel" hidden>
  <div class="top">
    <div>
      <h1>Visitas al portfolio</h1>
      <p class="muted" style="margin:2px 0 0"><span class="live" id="live"><i></i><span id="live-text">Conectando…</span></span> · <span id="updated"></span></p>
    </div>
    <div class="actions">
      <button class="btn" id="b-goto-msgs" hidden>✉️ Mensajes <span class="badge" id="msg-badge">0</span></button>
      <button class="btn" id="b-csv">⬇ Exportar CSV</button>
      <button class="btn" id="b-logout">Salir</button>
    </div>
  </div>

  <div class="grid">
    <!-- 1. Avisos -->
    <div class="card">
      <h2>Avisos de visitas</h2>
      <div class="toggles">
        <label class="switch" id="sw-telegram"><input type="checkbox" data-canal="telegram"><span class="track"></span><span>Telegram</span></label>
        <label class="switch" id="sw-email"><input type="checkbox" data-canal="email"><span class="track"></span><span>Mail</span></label>
        <button class="btn" id="b-test">Probar aviso</button>
        <span class="muted" id="toggle-note"></span>
      </div>
    </div>

    <!-- 2. Filtros -->
    <div class="card">
      <h2>Filtros</h2>
      <div class="filters">
        <div><label for="f-desde">Desde</label><input type="date" id="f-desde"></div>
        <div><label for="f-hasta">Hasta</label><input type="date" id="f-hasta"></div>
        <div><label for="f-pais">País</label><select id="f-pais"></select></div>
        <div><label for="f-ciudad">Ciudad</label><select id="f-ciudad"></select></div>
        <div><label for="f-dispositivo">Dispositivo</label><select id="f-dispositivo"></select></div>
        <div><label for="f-origen">Origen</label><select id="f-origen"></select></div>
        <div><label for="f-ref">Link (?ref=)</label><select id="f-ref"></select></div>
        <div><label for="f-texto">Buscar</label><input id="f-texto" placeholder="proyecto, navegador…"></div>
        <label class="check"><input type="checkbox" id="f-bots"> Ocultar posibles robots</label>
        <div><button class="btn" id="b-clear" style="width:100%">Limpiar</button></div>
      </div>
    </div>

    <!-- 3. Visitas -->
    <div class="card">
      <h2 id="list-title">Visitas</h2>
      <div class="bulk">
        <button class="btn danger small" id="b-del-sel" disabled>🗑 Borrar seleccionadas (0)</button>
        <button class="btn small" id="b-sel-none" hidden>Quitar selección</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th><input type="checkbox" id="sel-all" aria-label="Seleccionar las visitas mostradas"></th><th>Fecha y hora</th><th>Lugar</th><th>Dispositivo</th><th>Origen</th><th>Tiempo</th><th>Vio</th></tr></thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
      <div class="empty" id="empty" hidden>No hay visitas con estos filtros.</div>
      <div style="text-align:center;margin-top:12px"><button class="btn" id="b-more" hidden>Ver más</button></div>
    </div>

    <!-- 4. Todo lo demás -->
    <div class="card" id="c-msgs" hidden>
      <h2>Mensajes de contacto <span class="badge" id="msg-badge2">0</span></h2>
      <div class="msgs" id="msgs"></div>
    </div>

    <div class="grid kpis" id="kpis"></div>

    <div class="grid two">
      <div class="card"><h2>Visitas por día</h2><svg class="chart" id="c-day" role="img" aria-label="Visitas por día"></svg></div>
      <div class="card"><h2>Visitas por hora (Argentina)</h2><svg class="chart" id="c-hour" role="img" aria-label="Visitas por hora"></svg></div>
    </div>

    <div class="grid four">
      <div class="card"><h2>Países</h2><div class="rank" id="r-pais"></div></div>
      <div class="card"><h2>Ciudades</h2><div class="rank" id="r-ciudad"></div></div>
      <div class="card"><h2>Dispositivos</h2><div class="rank" id="r-dispositivo"></div></div>
      <div class="card"><h2>Origen</h2><div class="rank" id="r-origen"></div></div>
      <div class="card"><h2>Links (?ref=)</h2><div class="rank" id="r-ref"></div></div>
      <div class="card"><h2>Proyectos más vistos</h2><div class="rank" id="r-proyecto"></div></div>
    </div>
  </div>
</main>

<!-- Detalle -->
<div class="modal" id="modal" hidden>
  <div class="card" role="dialog" aria-modal="true" aria-labelledby="m-title">
    <div class="top" style="margin-bottom:10px"><h1 id="m-title" style="font-size:18px">Detalle de la visita</h1><button class="btn" id="m-close">Cerrar</button></div>
    <div id="m-body"></div>
    <div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn danger" id="m-delete">🗑 Borrar esta visita</button></div>
  </div>
</div>

<!-- Confirmación -->
<div class="modal confirm" id="confirm" hidden>
  <div class="card" role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-text">
    <h1 id="cf-title">⚠️ ¿Seguro?</h1>
    <p id="cf-text"></p>
    <p class="muted" style="margin:0">Esta acción es <b>permanente</b> y no se puede deshacer.</p>
    <div class="acts"><button class="btn" id="cf-no">Cancelar</button><button class="btn danger" id="cf-yes">Sí, borrar</button></div>
  </div>
</div>

<div class="toasts" id="toasts" aria-live="polite"></div>

<script>
(function () {
  var $ = function (id) { return document.getElementById(id) }
  var TZ = 'America/Argentina/Buenos_Aires'
  var PAGE = 50
  var state = { all: [], filtered: [], shown: PAGE, challenge: null, config: null, selected: {}, fresh: {}, msgs: [], detailId: null, kpi: {} }

  // ── Utilidades ─────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function api(path, opts) {
    opts = opts || {}
    var init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} }
    if (init.method === 'POST') {
      init.headers['content-type'] = 'application/json'
      init.headers['x-pf'] = '1'
      init.body = JSON.stringify(opts.body || {})
    }
    return fetch('/api/s/' + path, init).then(function (r) {
      return r.json().catch(function () { return {} }).then(function (d) { d._status = r.status; return d })
    }).catch(function () { return { _status: 0 } })
  }
  function show(view) {
    ['v-login', 'v-code', 'v-panel'].forEach(function (v) { $(v).hidden = v !== view })
    if (view !== 'v-panel') stopLive()
  }
  // Avisos emergentes que bajan desde arriba: ok (verde), off (rojo), visit (violeta)
  function toast(type, title, sub, ms) {
    var el = document.createElement('div')
    el.className = 'toast ' + type
    el.setAttribute('role', 'status')
    el.innerHTML = esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '')
    $('toasts').appendChild(el)
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove()
    setTimeout(function () {
      el.classList.add('out')
      setTimeout(function () { el.remove() }, 350)
    }, ms || 3200)
  }
  var fmtDateTime = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  var fmtLong = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  var fmtTime = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  var fmtDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
  var fmtHour = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, hour: '2-digit', hour12: false })
  function dayKey(iso) { return fmtDay.format(new Date(iso)) }
  function hourOf(iso) { return Number(fmtHour.format(new Date(iso))) % 24 }
  function dur(s) {
    s = Number(s) || 0
    if (s < 60) return s + ' s'
    var m = Math.floor(s / 60), r = s % 60
    if (m < 60) return m + ' min' + (r ? ' ' + r + ' s' : '')
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min'
  }
  function place(v) {
    var parts = [v.ciudad, v.region, v.pais].filter(Boolean)
    return parts.filter(function (p, i) { return parts.indexOf(p) === i }).join(', ') || 'Desconocido'
  }
  function flag(code) {
    if (!/^[A-Za-z]{2}$/.test(code || '')) return '🌎'
    return String.fromCodePoint.apply(null, code.toUpperCase().split('').map(function (c) { return 0x1f1a5 + c.charCodeAt(0) }))
  }
  /** Posible robot: viene de un centro de datos, o estuvo menos de 3 s sin hacer nada (pasados 2 min). */
  function isBot(v) {
    if (v.posibleRobot) return true
    var idle = (v.duracion || 0) < 3 && (v.secciones || []).length <= 1 && !(v.proyectos || []).length && !(v.clicks || []).length && !(v.imagenes || []).length
    return idle && Date.now() - Date.parse(v.inicio) > 120000
  }

  // ── Login ──────────────────────────────────────────────
  $('b-eye').addEventListener('click', function () {
    var visible = $('pass').type === 'password'
    $('pass').type = visible ? 'text' : 'password'
    $('eye-on').hidden = visible; $('eye-off').hidden = !visible
    $('b-eye').setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña')
    $('b-eye').setAttribute('aria-pressed', String(visible))
    $('pass').focus()
  })
  $('f-login').addEventListener('submit', function (e) {
    e.preventDefault()
    var btn = e.submitter; if (btn) btn.disabled = true
    $('e-login').textContent = ''
    api('login', { method: 'POST', body: { user: $('user').value, pass: $('pass').value } }).then(function (d) {
      if (btn) btn.disabled = false
      if (!d.challenge) { $('e-login').textContent = d.error || 'No se pudo ingresar.'; return }
      state.challenge = d.challenge
      $('pass').value = ''; $('pass').type = 'password'; $('eye-on').hidden = false; $('eye-off').hidden = true
      $('code-help').textContent = 'Te mandamos un código de 6 dígitos por ' + d.canales.join(' y ') + '. Vence en 5 minutos.'
      $('code').value = ''; $('e-code').textContent = ''
      show('v-code'); $('code').focus()
    })
  })
  $('f-code').addEventListener('submit', function (e) {
    e.preventDefault()
    var btn = e.submitter; if (btn) btn.disabled = true
    api('codigo', { method: 'POST', body: { challenge: state.challenge, code: $('code').value } }).then(function (d) {
      if (btn) btn.disabled = false
      if (d.ok) { state.challenge = null; boot(); return }
      $('e-code').textContent = d.error || 'Código incorrecto.'
      if (d.restart) setTimeout(function () { show('v-login'); $('user').focus() }, 1500)
    })
  })
  $('code').addEventListener('input', function (e) {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6)
    if (e.target.value.length === 6) $('f-code').requestSubmit()
  })
  $('b-back').addEventListener('click', function () { show('v-login') })
  $('b-logout').addEventListener('click', function () {
    api('salir', { method: 'POST' }).then(function () { state.all = []; show('v-login') })
  })

  // ── Interruptores ──────────────────────────────────────
  function renderToggles(config, canales) {
    state.config = config
    var notes = []
    ;['telegram', 'email'].forEach(function (c) {
      var input = document.querySelector('[data-canal="' + c + '"]')
      var ready = canales[c]
      input.checked = !!config[c] && ready
      input.disabled = !ready
      $('sw-' + c).classList.toggle('off', !ready)
      if (!ready) notes.push((c === 'email' ? 'Mail' : 'Telegram') + ' sin configurar en Netlify')
    })
    $('toggle-note').textContent = notes.join(' · ')
  }
  document.querySelectorAll('[data-canal]').forEach(function (input) {
    input.addEventListener('change', function () {
      var body = {}; body[input.dataset.canal] = input.checked
      var name = input.dataset.canal === 'email' ? 'mail' : 'Telegram'
      api('ajustes', { method: 'POST', body: body }).then(function (d) {
        if (d._status === 401) return show('v-login')
        if (d._status !== 200) { input.checked = !input.checked; return toast('off', 'No se pudo guardar el cambio') }
        if (input.checked) toast('ok', '✅ Avisos por ' + name + ' activados')
        else toast('off', '⛔ Avisos por ' + name + ' desactivados')
      })
    })
  })
  $('b-test').addEventListener('click', function (e) {
    e.target.disabled = true
    api('prueba', { method: 'POST' }).then(function (d) {
      e.target.disabled = false
      var ok = [d.telegram && 'Telegram', d.email && 'mail'].filter(Boolean)
      if (ok.length) toast('ok', '📨 Aviso de prueba enviado', 'Por ' + ok.join(' y '))
      else toast('off', 'No hay canales activos que funcionen')
    })
  })

  // ── Datos ──────────────────────────────────────────────
  function stamp() { $('updated').textContent = state.all.length + ' visitas en total · actualizado ' + fmtTime.format(new Date()) }
  function load(silent) {
    return Promise.all([api('visitas'), api('mensajes')]).then(function (res) {
      var d = res[0], m = res[1]
      if (d._status === 401) return show('v-login')
      if (d._status !== 200) { if (!silent) toast('off', 'No se pudieron cargar las visitas'); return }
      var known = {}
      state.all.forEach(function (v) { known[v.id] = true })
      var hadData = state.all.length > 0
      state.all = d.visitas || []
      // Visitas que llegaron mientras la pestaña estaba oculta: se resaltan igual que en vivo
      if (hadData) state.all.forEach(function (v) { if (!known[v.id]) state.fresh[v.id] = Date.now() })
      state.msgs = m.mensajes || []
      stamp(); fillSelects(); apply(true); renderMsgs()
    })
  }
  function boot() {
    api('yo').then(function (d) {
      if (!d.ok) { show('v-login'); $('user').focus(); return }
      show('v-panel')
      renderToggles(d.config, d.canales)
      load().then(startLive)
    })
  }

  // ── En vivo (Ably, por Server-Sent Events) ─────────────
  var es = null, retry = null, renew = null, lastEventId = '', hiddenAt = 0
  function setLive(on, text) {
    $('live').classList.toggle('on', on)
    $('live-text').textContent = text
  }
  function stopLive() {
    if (es) { es.close(); es = null }
    clearTimeout(retry); clearTimeout(renew)
    setLive(false, 'Desconectado')
  }
  function startLive() {
    if (es) { es.close(); es = null }
    clearTimeout(retry); clearTimeout(renew)
    api('vivo').then(function (d) {
      if (d._status === 401) return show('v-login')
      if (!d.live) {
        setLive(false, d.error ? 'En vivo sin configurar' : 'Sin conexión en vivo')
        if (!d.error) retry = setTimeout(startLive, 15000)
        return
      }
      var url = d.live.host + '/sse?v=1.2&channels=' + encodeURIComponent(d.live.channel) + '&accessToken=' + encodeURIComponent(d.live.token)
      if (lastEventId) url += '&lastEvent=' + encodeURIComponent(lastEventId)
      var source = new EventSource(url)
      es = source
      source.onopen = function () { setLive(true, 'En vivo') }
      source.onmessage = function (e) {
        if (e.lastEventId) lastEventId = e.lastEventId
        try {
          var msg = JSON.parse(e.data)
          var data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data
          onLive(data)
        } catch (err) {}
      }
      source.addEventListener('error', function (e) {
        if (es !== source) return
        setLive(false, 'Reconectando…')
        // Error enviado por Ably (por ejemplo, token vencido): se pide uno nuevo
        if (e.data || source.readyState === 2) {
          source.close(); es = null
          retry = setTimeout(function () { startLive(); load(true) }, e.data ? 1000 : 5000)
        }
      })
      // Renueva el token antes de que venza
      var ms = Math.max(60000, (d.live.expires || Date.now() + 3600000) - Date.now() - 120000)
      renew = setTimeout(startLive, ms)
    })
  }
  document.addEventListener('visibilitychange', function () {
    if ($('v-panel').hidden) return
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return }
    // Al volver a la pestaña: si estuvo un rato oculta, se pone al día sin recargar la página
    if (hiddenAt && Date.now() - hiddenAt > 30000) { load(true); if (!es || es.readyState === 2) startLive() }
  })

  function onLive(data) {
    if (!data || !data.tipo) return
    if (data.tipo === 'nueva' && data.visita) {
      var v = data.visita
      if (state.all.some(function (x) { return x.id === v.id })) return
      state.all.unshift(v)
      state.fresh[v.id] = Date.now()
      stamp(); fillSelects(); apply(true)
      toast('visit', '👀 ¡Alguien entró a ver tu portfolio!', [place(v), v.dispositivo, v.origen === 'Directo' ? 'entró directo' : 'vino de ' + v.origen].join(' · '), 5000)
    } else if (data.tipo === 'actualizacion' && data.visita) {
      var i = state.all.findIndex(function (x) { return x.id === data.visita.id })
      if (i === -1) return
      state.all[i] = data.visita
      apply(true)
      if (state.detailId === data.visita.id) openDetail(data.visita)
    } else if (data.tipo === 'mensaje' && data.mensaje) {
      if (state.msgs.some(function (m) { return m.id === data.mensaje.id })) return
      state.msgs.unshift(data.mensaje)
      renderMsgs(data.mensaje.id)
      toast('visit', '✉️ Nuevo mensaje de ' + data.mensaje.nombre, data.mensaje.motivo + (data.mensaje.empresa ? ' · ' + data.mensaje.empresa : ''), 6000)
    }
  }

  // ── Filtros ────────────────────────────────────────────
  var SELECTS = { 'f-pais': 'pais', 'f-ciudad': 'ciudad', 'f-dispositivo': 'dispositivo', 'f-origen': 'origen', 'f-ref': 'ref' }
  var EMPTY = { ref: 'Sin etiqueta' }
  function val(v, field) { return v[field] || EMPTY[field] || 'Desconocido' }
  function options(field, list) {
    var counts = {}
    list.forEach(function (v) { var k = val(v, field); counts[k] = (counts[k] || 0) + 1 })
    return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] }).map(function (k) { return [k, counts[k]] })
  }
  function fillSelects() {
    Object.keys(SELECTS).forEach(function (id) {
      var sel = $(id), field = SELECTS[id], current = sel.value
      var base = field === 'ciudad' && $('f-pais').value
        ? state.all.filter(function (v) { return val(v, 'pais') === $('f-pais').value })
        : state.all
      sel.innerHTML = '<option value="">Todos</option>' + options(field, base).map(function (o) {
        return '<option value="' + esc(o[0]) + '">' + esc(o[0]) + ' (' + o[1] + ')</option>'
      }).join('')
      sel.value = current
      if (sel.value !== current) sel.value = ''
    })
  }
  /** keep = true: no vuelve a la primera página (para actualizaciones en vivo). */
  function apply(keep) {
    var desde = $('f-desde').value, hasta = $('f-hasta').value
    var text = $('f-texto').value.trim().toLowerCase()
    var hideBots = $('f-bots').checked
    state.filtered = state.all.filter(function (v) {
      var d = dayKey(v.inicio)
      if (desde && d < desde) return false
      if (hasta && d > hasta) return false
      if (hideBots && isBot(v)) return false
      for (var id in SELECTS) {
        var value = $(id).value
        if (value && val(v, SELECTS[id]) !== value) return false
      }
      if (text) {
        var hay = [v.ciudad, v.region, v.pais, v.dispositivo, v.so, v.navegador, v.origen, v.origenHost, v.idioma, v.ref]
          .concat(v.secciones || [], v.proyectos || [], v.imagenes || [], v.clicks || []).join(' ').toLowerCase()
        if (hay.indexOf(text) === -1) return false
      }
      return true
    })
    if (keep !== true) state.shown = PAGE
    render()
  }
  ;['f-desde', 'f-hasta', 'f-dispositivo', 'f-origen', 'f-ciudad', 'f-ref', 'f-bots'].forEach(function (id) { $(id).addEventListener('change', apply) })
  $('f-pais').addEventListener('change', function () { $('f-ciudad').value = ''; fillSelects(); apply() })
  $('f-texto').addEventListener('input', function () { clearTimeout(apply.t); apply.t = setTimeout(apply, 200) })
  $('b-clear').addEventListener('click', function () {
    ['f-desde', 'f-hasta', 'f-texto'].concat(Object.keys(SELECTS)).forEach(function (id) { $(id).value = '' })
    $('f-bots').checked = false
    fillSelects(); apply()
  })

  // ── Dibujo ─────────────────────────────────────────────
  function render() {
    var list = state.filtered
    renderRows()
    renderKpis(list)
    renderDays(list)
    renderHours(list)
    renderRank('r-pais', list, function (v) { return val(v, 'pais') }, 'f-pais', function (k) {
      var v = list.find(function (x) { return val(x, 'pais') === k }); return flag(v && v.paisCodigo) + ' ' + k
    })
    renderRank('r-ciudad', list, function (v) { return val(v, 'ciudad') }, 'f-ciudad')
    renderRank('r-dispositivo', list, function (v) { return val(v, 'dispositivo') }, 'f-dispositivo')
    renderRank('r-origen', list, function (v) { return val(v, 'origen') }, 'f-origen')
    renderRank('r-ref', list.filter(function (v) { return v.ref }), function (v) { return v.ref }, 'f-ref')
    renderRankMulti('r-proyecto', list, 'proyectos')
  }
  function renderKpis(list) {
    var today = dayKey(new Date().toISOString())
    var weekAgo = Date.now() - 7 * 864e5
    var withTime = list.filter(function (v) { return v.duracion > 0 })
    var avg = withTime.length ? Math.round(withTime.reduce(function (s, v) { return s + v.duracion }, 0) / withTime.length) : 0
    var mobile = list.length ? Math.round(100 * list.filter(function (v) { return v.dispositivo !== 'Compu' }).length / list.length) : 0
    var items = [
      ['total', list.length, 'Visitas'],
      ['hoy', list.filter(function (v) { return dayKey(v.inicio) === today }).length, 'Hoy'],
      ['semana', list.filter(function (v) { return Date.parse(v.inicio) > weekAgo }).length, 'Últimos 7 días'],
      ['prom', dur(avg), 'Tiempo promedio'],
      ['cel', mobile + '%', 'Desde el celular'],
    ]
    if (!$('kpis').children.length) {
      $('kpis').innerHTML = items.map(function (k) {
        return '<div class="card kpi"><div class="v" data-k="' + k[0] + '">' + esc(k[1]) + '</div><div class="l">' + esc(k[2]) + '</div></div>'
      }).join('')
      items.forEach(function (k) { state.kpi[k[0]] = k[1] })
      return
    }
    items.forEach(function (k) {
      var el = $('kpis').querySelector('[data-k="' + k[0] + '"]')
      var prev = state.kpi[k[0]]
      state.kpi[k[0]] = k[1]
      if (prev === k[1]) return
      if (typeof k[1] === 'number' && typeof prev === 'number' && k[1] > prev) countUp(el, prev, k[1])
      else el.textContent = k[1]
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump')
    })
  }
  function countUp(el, from, to) {
    var start = performance.now(), ms = 700
    function step(now) {
      var t = Math.min(1, (now - start) / ms)
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  function bars(svg, labels, values, labelEvery) {
    var W = svg.clientWidth || 500, H = 180, pad = 22, top = 14
    var max = Math.max.apply(null, values.concat([1]))
    var bw = (W - 8) / values.length
    var out = ''
    values.forEach(function (v, i) {
      var h = Math.round((H - pad - top) * v / max)
      var x = 4 + i * bw
      out += '<rect class="bar" x="' + (x + bw * 0.12).toFixed(1) + '" y="' + (H - pad - h) + '" width="' + Math.max(1, bw * 0.76).toFixed(1) + '" height="' + h + '" rx="3"><title>' + esc(labels[i] + ': ' + v) + '</title></rect>'
      if (v > 0 && bw > 16) out += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - pad - h - 4) + '" text-anchor="middle">' + v + '</text>'
      if (i % labelEvery === 0) out += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(labels[i]) + '</text>'
    })
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H)
    svg.innerHTML = out
  }
  function renderDays(list) {
    var desde = $('f-desde').value, hasta = $('f-hasta').value
    var end = hasta ? new Date(hasta + 'T12:00:00') : new Date()
    var start = desde ? new Date(desde + 'T12:00:00') : new Date(end.getTime() - 29 * 864e5)
    var days = []
    for (var t = start.getTime(); t <= end.getTime() + 1; t += 864e5) days.push(dayKey(new Date(t).toISOString()))
    if (days.length > 120) days = days.slice(-120)
    var counts = {}
    list.forEach(function (v) { var d = dayKey(v.inicio); counts[d] = (counts[d] || 0) + 1 })
    bars($('c-day'), days.map(function (d) { return d.slice(8, 10) + '/' + d.slice(5, 7) }), days.map(function (d) { return counts[d] || 0 }), Math.ceil(days.length / 10))
  }
  function renderHours(list) {
    var counts = new Array(24).fill(0)
    list.forEach(function (v) { counts[hourOf(v.inicio)]++ })
    bars($('c-hour'), counts.map(function (_, h) { return h + 'h' }), counts, 3)
  }
  function renderRank(id, list, keyFn, filterId, labelFn) {
    var counts = {}
    list.forEach(function (v) { var k = keyFn(v); counts[k] = (counts[k] || 0) + 1 })
    drawRank(id, counts, filterId, labelFn)
  }
  function renderRankMulti(id, list, field) {
    var counts = {}
    list.forEach(function (v) { (v[field] || []).forEach(function (k) { counts[k] = (counts[k] || 0) + 1 }) })
    drawRank(id, counts, null, null, 'f-texto')
  }
  function drawRank(id, counts, filterId, labelFn, textFilter) {
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] }).slice(0, 6)
    var max = keys.length ? counts[keys[0]] : 1
    var el = $(id)
    if (!keys.length) { el.innerHTML = '<p class="muted" style="margin:0">Sin datos todavía.</p>'; return }
    el.innerHTML = keys.map(function (k) {
      return '<button type="button" data-k="' + esc(k) + '"><i class="fill" style="width:' + Math.round(100 * counts[k] / max) + '%"></i><span>' + esc(labelFn ? labelFn(k) : k) + '</span><span class="n">' + counts[k] + '</span></button>'
    }).join('')
    el.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (textFilter) { $(textFilter).value = b.dataset.k; apply(); return }
        if (filterId === 'f-ciudad') {
          var v = state.all.find(function (x) { return val(x, 'ciudad') === b.dataset.k })
          $('f-pais').value = v ? val(v, 'pais') : ''
          fillSelects()
        }
        $(filterId).value = b.dataset.k
        apply()
        $('list-title').scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }
  function renderRows() {
    var list = state.filtered.slice(0, state.shown)
    var now = Date.now()
    $('list-title').textContent = 'Visitas (' + state.filtered.length + ')'
    $('empty').hidden = state.filtered.length > 0
    $('b-more').hidden = state.filtered.length <= state.shown
    $('rows').innerHTML = list.map(function (v, i) {
      var seen = (v.proyectos || []).length ? (v.proyectos || []).length + ' proyecto(s)' : (v.secciones || []).length ? (v.secciones || []).length + ' sección(es)' : '—'
      var isNew = state.fresh[v.id] && now - state.fresh[v.id] < 3000
      var tags = (isBot(v) ? ' <span class="pill bot">🤖 posible robot</span>' : '') + (v.ref ? ' <span class="pill ref">🏷️ ' + esc(v.ref) + '</span>' : '')
      return '<tr data-i="' + i + '" class="' + (state.selected[v.id] ? 'sel ' : '') + (isNew ? 'nueva' : '') + '">' +
        '<td><input type="checkbox" class="row-sel" data-id="' + esc(v.id) + '"' + (state.selected[v.id] ? ' checked' : '') + ' aria-label="Seleccionar visita"></td>' +
        '<td>' + esc(fmtDateTime.format(new Date(v.inicio))) + '</td><td>' + flag(v.paisCodigo) + ' ' + esc(place(v)) + tags + '</td><td>' + esc(v.dispositivo + ' · ' + v.navegador) + '</td><td><span class="pill">' + esc(v.origen) + '</span></td><td>' + esc(dur(v.duracion)) + '</td><td>' + esc(seen) + '</td></tr>'
    }).join('')
    syncSelection()
  }
  $('b-more').addEventListener('click', function () { state.shown += PAGE; renderRows() })
  $('rows').addEventListener('click', function (e) {
    if (e.target.classList.contains('row-sel')) {
      if (e.target.checked) state.selected[e.target.dataset.id] = true
      else delete state.selected[e.target.dataset.id]
      e.target.closest('tr').classList.toggle('sel', e.target.checked)
      syncSelection()
      return
    }
    var tr = e.target.closest('tr'); if (!tr) return
    openDetail(state.filtered[Number(tr.dataset.i)])
  })

  // ── Selección y borrado ────────────────────────────────
  function selectedIds() { return Object.keys(state.selected).filter(function (id) { return state.all.some(function (v) { return v.id === id }) }) }
  function syncSelection() {
    var ids = selectedIds()
    $('b-del-sel').disabled = !ids.length
    $('b-del-sel').textContent = '🗑 Borrar seleccionadas (' + ids.length + ')'
    $('b-sel-none').hidden = !ids.length
    var visible = state.filtered.slice(0, state.shown)
    $('sel-all').checked = visible.length > 0 && visible.every(function (v) { return state.selected[v.id] })
  }
  $('sel-all').addEventListener('change', function (e) {
    state.filtered.slice(0, state.shown).forEach(function (v) {
      if (e.target.checked) state.selected[v.id] = true
      else delete state.selected[v.id]
    })
    renderRows()
  })
  $('b-sel-none').addEventListener('click', function () { state.selected = {}; renderRows() })

  var pending = null
  function confirmBox(text, onYes) {
    pending = onYes
    $('cf-text').textContent = text
    $('confirm').hidden = false
    $('cf-no').focus()
  }
  function closeConfirm() { $('confirm').hidden = true; pending = null }
  $('cf-no').addEventListener('click', closeConfirm)
  $('cf-yes').addEventListener('click', function () {
    var fn = pending
    closeConfirm()
    if (fn) fn()
  })
  function deleteVisits(ids) {
    api('borrar', { method: 'POST', body: { ids: ids } }).then(function (d) {
      if (d._status === 401) return show('v-login')
      if (d._status !== 200) return toast('off', 'No se pudieron borrar las visitas')
      var gone = {}
      ids.forEach(function (id) { gone[id] = true; delete state.selected[id] })
      state.all = state.all.filter(function (v) { return !gone[v.id] })
      stamp(); fillSelects(); apply(true)
      toast('off', '🗑 ' + (ids.length === 1 ? 'Visita borrada' : ids.length + ' visitas borradas'))
    })
  }
  $('b-del-sel').addEventListener('click', function () {
    var ids = selectedIds()
    if (!ids.length) return
    confirmBox('Vas a borrar ' + (ids.length === 1 ? '1 visita' : ids.length + ' visitas') + ' de forma permanente.', function () { deleteVisits(ids) })
  })
  $('m-delete').addEventListener('click', function () {
    var id = state.detailId
    if (!id) return
    confirmBox('Vas a borrar esta visita de forma permanente.', function () { closeDetail(); deleteVisits([id]) })
  })

  // ── Detalle ────────────────────────────────────────────
  function steps(list) {
    return list && list.length ? '<div class="steps">' + list.map(function (s) { return '<span class="pill">' + esc(s) + '</span>' }).join('') + '</div>' : '<span class="muted">—</span>'
  }
  function openDetail(v) {
    if (!v) return
    state.detailId = v.id
    var rows = [
      ['Entró', esc(fmtLong.format(new Date(v.inicio)))],
      ['Última actividad', esc(fmtLong.format(new Date(v.ultimo || v.inicio)))],
      ['Tiempo en el sitio', esc(dur(v.duracion))],
      ['Lugar (aprox.)', flag(v.paisCodigo) + ' ' + esc(place(v)) + (isBot(v) ? ' <span class="pill bot">🤖 posible robot</span>' : '')],
      ['Zona horaria', esc(v.zona || '—')],
      ['Dispositivo', esc(v.dispositivo + ' · ' + v.so + ' · ' + v.navegador)],
      ['Pantalla', esc(v.pantalla || '—')],
      ['Idioma', esc(v.idioma || '—')],
      ['Origen', esc(v.origen + (v.origenHost && v.origenHost !== v.origen ? ' (' + v.origenHost + ')' : ''))],
      ['Link (?ref=)', v.ref ? '<span class="pill ref">🏷️ ' + esc(v.ref) + '</span>' : '<span class="muted">—</span>'],
      ['Secciones (en orden)', steps(v.secciones)],
      ['Proyectos que vio', steps(v.proyectos)],
      ['Imágenes que abrió', steps(v.imagenes)],
      ['Botones que tocó', steps(v.clicks)],
    ]
    $('m-body').innerHTML = '<dl>' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>' }).join('') + '</dl>'
    if ($('modal').hidden) { $('modal').hidden = false; $('m-close').focus() }
  }
  function closeDetail() { $('modal').hidden = true; state.detailId = null }
  $('m-close').addEventListener('click', closeDetail)
  $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeDetail() })
  $('confirm').addEventListener('click', function (e) { if (e.target === $('confirm')) closeConfirm() })
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return
    if (!$('confirm').hidden) return closeConfirm()
    closeDetail()
  })

  // ── Mensajes de contacto ───────────────────────────────
  function renderMsgs(freshId) {
    var unread = state.msgs.filter(function (m) { return !m.leido }).length
    $('c-msgs').hidden = !state.msgs.length
    $('b-goto-msgs').hidden = !state.msgs.length
    $('msg-badge').textContent = unread; $('msg-badge2').textContent = unread
    $('msg-badge').hidden = !unread; $('msg-badge2').hidden = !unread
    $('msgs').innerHTML = state.msgs.map(function (m) {
      var mailto = 'mailto:' + encodeURIComponent(m.email) + '?subject=' + encodeURIComponent('Re: ' + m.motivo + ' - Portfolio Martin Castro')
      var hasVisit = m.visita && state.all.some(function (v) { return v.key === m.visita })
      return '<div class="msg' + (m.leido ? '' : ' unread') + (m.id === freshId ? ' nueva' : '') + '" data-id="' + esc(m.id) + '">' +
        '<div class="head"><b>' + esc(m.nombre) + (m.empresa ? ' · ' + esc(m.empresa) : '') + '</b><span class="muted">' + esc(fmtDateTime.format(new Date(m.fecha))) + '</span></div>' +
        '<div><span class="pill ref">' + esc(m.motivo) + '</span> <a class="mail" href="' + esc(mailto) + '">' + esc(m.email) + '</a></div>' +
        '<div class="body">' + esc(m.mensaje) + '</div>' +
        '<div class="acts"><a class="btn small" href="' + esc(mailto) + '" data-act="leido">↩ Responder</a>' +
        '<button class="btn small" data-act="' + (m.leido ? 'noleido' : 'leido') + '">' + (m.leido ? 'Marcar como no leído' : '✓ Marcar como leído') + '</button>' +
        (hasVisit ? '<button class="btn small" data-act="visita">Ver su visita</button>' : '') +
        '<button class="btn small danger" data-act="borrar">🗑 Borrar</button></div></div>'
    }).join('')
  }
  $('msgs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return
    var id = b.closest('.msg').dataset.id
    var m = state.msgs.find(function (x) { return x.id === id }); if (!m) return
    var act = b.dataset.act
    if (act === 'visita') return openDetail(state.all.find(function (v) { return v.key === m.visita }))
    if (act === 'borrar') {
      return confirmBox('Vas a borrar el mensaje de ' + m.nombre + ' de forma permanente.', function () {
        api('mensajes/borrar', { method: 'POST', body: { ids: [id] } }).then(function (d) {
          if (d._status !== 200) return toast('off', 'No se pudo borrar el mensaje')
          state.msgs = state.msgs.filter(function (x) { return x.id !== id }); renderMsgs(); toast('off', '🗑 Mensaje borrado')
        })
      })
    }
    var leido = act !== 'noleido'
    if (m.leido === leido) return
    api('mensajes/leido', { method: 'POST', body: { ids: [id], leido: leido } }).then(function (d) {
      if (d._status === 200) { m.leido = leido; renderMsgs() }
    })
  })
  $('b-goto-msgs').addEventListener('click', function () { $('c-msgs').scrollIntoView({ behavior: 'smooth', block: 'start' }) })

  // ── CSV ────────────────────────────────────────────────
  $('b-csv').addEventListener('click', function () {
    var cols = [
      ['Fecha y hora (AR)', function (v) { return fmtDateTime.format(new Date(v.inicio)) }],
      ['País', 'pais'], ['Región', 'region'], ['Ciudad', 'ciudad'], ['Dispositivo', 'dispositivo'], ['Sistema', 'so'],
      ['Navegador', 'navegador'], ['Origen', 'origen'], ['Dominio de origen', 'origenHost'], ['Link (?ref=)', 'ref'], ['Idioma', 'idioma'],
      ['Tiempo (segundos)', 'duracion'],
      ['Posible robot', function (v) { return isBot(v) ? 'Sí' : 'No' }],
      ['Secciones', function (v) { return (v.secciones || []).join(' > ') }],
      ['Proyectos', function (v) { return (v.proyectos || []).join(' | ') }],
      ['Imágenes', function (v) { return (v.imagenes || []).join(' | ') }],
      ['Botones', function (v) { return (v.clicks || []).join(' | ') }],
    ]
    function cell(x) {
      var s = String(x == null ? '' : x)
      if (/^[=+\-@]/.test(s)) s = "'" + s // evita fórmulas al abrirlo en Excel
      return '"' + s.replace(/"/g, '""') + '"'
    }
    var lines = [cols.map(function (c) { return cell(c[0]) }).join(';')].concat(state.filtered.map(function (v) {
      return cols.map(function (c) { return cell(typeof c[1] === 'function' ? c[1](v) : v[c[1]]) }).join(';')
    }))
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    var a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'visitas-' + dayKey(new Date().toISOString()) + '.csv'
    a.click()
    setTimeout(function () { URL.revokeObjectURL(a.href) }, 1000)
  })

  window.addEventListener('resize', function () { clearTimeout(render.t); render.t = setTimeout(function () { if (!$('v-panel').hidden) { renderDays(state.filtered); renderHours(state.filtered) } }, 150) })
  boot()
})()
</script>
</body>
</html>`
