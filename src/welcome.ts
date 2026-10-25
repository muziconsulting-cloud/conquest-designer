/**
 * `bun run src/welcome.ts --port 3500` — the venue's front door.
 *
 * This is deliberately **not** the exchange. It is the smallest thing that proves the
 * production path end to end: Cloudflare → nginx → Bun → a page you can look at. The
 * exchange is a separate entry point (`src/server.ts`) and is not served here until its
 * refactor is unblocked.
 *
 * The stylesheet comes from `src/design.ts`, a verbatim copy of the proven WardByWard
 * design rail (`src/Design.ts`): the same :root tokens, the same glass card, the same
 * buttons. Nothing here re-declares a colour, a card or a button.
 *
 * Routes:
 *   GET /                      the welcome page
 *   GET /assets/*              static files from ./assets (the logo)
 *   GET /health                {"ok":true} — the deploy script's readiness probe
 *
 * No build step, no dependencies, no state, no database: a beacon has nothing to query.
 */

import { join } from 'node:path'
import { RECEIVING_ADDRESS } from './venue.ts'
import { ROOT } from './root.ts'
import { CSS } from './design.ts'

const args = process.argv.slice(2)
let port = 3500
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index] ?? ''
  if (arg === '--port') port = Number(args[index + 1])
  else if (arg.startsWith('--port=')) port = Number(arg.slice('--port='.length))
}
if (!Number.isInteger(port) || port <= 0) {
  console.error(`invalid --port: ${port}`)
  process.exit(1)
}

// The two wordmarks, exactly as the owner wrote them. Used in all copy.
const WORDMARK_EXCHANGE = 'ConquestDESIGNER'
const WORDMARK_VENUE = 'ConquestDesignEngineeringHQ'

const ASSET_ROOT = join(ROOT, 'assets')
const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

const html = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  })

const page = (): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${WORDMARK_EXCHANGE} · ${WORDMARK_VENUE}</title>
<meta name="description" content="${WORDMARK_EXCHANGE} — the agent exchange at ${WORDMARK_VENUE}.">
<link rel="icon" href="/assets/conquest-card.jpg">
<style>${CSS}</style>
<style>
  .logo-plate{margin:0 0 20px}
  .logo-plate img{display:block;width:100%;height:auto;border-radius:12px}
  .hdr h1{text-transform:none}
  .lead{font-size:.9rem;color:var(--text-muted);max-width:56ch;margin:10px auto 0;line-height:1.6}
  .status{display:inline-flex;align-items:center;gap:8px;font-size:.62rem;font-weight:700;
    letter-spacing:.14em;text-transform:uppercase;color:var(--accent-gold);
    border:1px solid var(--border-accent);border-radius:999px;padding:6px 14px;margin-top:6px}
  .dot{width:7px;height:7px;border-radius:50%;background:var(--accent-green);
    box-shadow:0 0 0 4px rgba(0,232,123,.14)}
  .foot{font-size:.7rem;color:var(--text-muted);text-align:center;margin-top:18px;line-height:1.8}
  .foot code{color:var(--accent-gold-light);font-size:.68rem;word-break:break-all}
</style>
</head>
<body>
<div class="wrap" style="max-width:720px">
  <header class="hdr">
    <h1>${WORDMARK_EXCHANGE}</h1>
    <p>${WORDMARK_VENUE}</p>
  </header>

  <div class="card">
    <div class="logo-plate">
      <img src="/assets/conquest-card.jpg" alt="${WORDMARK_EXCHANGE}" width="1024" height="687">
    </div>
    <p class="lead" style="text-align:center">
      The agent exchange: agents get registered, priced, listed and traded.
    </p>
    <div style="text-align:center;margin-top:16px">
      <span class="status"><span class="dot"></span>Landing page live</span>
    </div>
  </div>

  <p class="foot">
    The exchange opens at this address.<br>
    ${WORDMARK_VENUE} · receiving address <code>${RECEIVING_ADDRESS}</code>
  </p>
</div>
</body>
</html>`

const asset = (pathname: string): Response | null => {
  const name = pathname.slice('/assets/'.length)
  if (name === '' || name.includes('/') || name.includes('\\') || name.includes('..')) return null
  const ext = name.slice(name.lastIndexOf('.'))
  const type = CONTENT_TYPES[ext.toLowerCase()]
  if (!type) return null
  const file = Bun.file(join(ASSET_ROOT, name))
  return new Response(file, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

const server = Bun.serve({
  port,
  fetch(request: Request): Response | Promise<Response> {
    const url = new URL(request.url)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    }
    if (url.pathname === '/health') {
      return Response.json({ ok: true, venue: WORDMARK_VENUE, surface: 'welcome' })
    }
    if (url.pathname === '/' || url.pathname === '/index.html') return html(page())
    if (url.pathname.startsWith('/assets/')) {
      const response = asset(url.pathname)
      if (response) return response
    }
    return html(
      `<!doctype html><meta charset="utf-8"><title>Not found</title>
       <body style="font:16px system-ui;background:#0a1628;color:#eef2f7;padding:40px">
       <p>Not found. <a style="color:#d4a843" href="/">Go to the front door.</a></p></body>`,
      404,
    )
  },
})

console.log(`welcome: ${WORDMARK_EXCHANGE} → http://127.0.0.1:${server.port}`)
