/**
 * HTTP surface — Bun.serve.
 * POST /run is the programmatic entry point a judge calls without clicking.
 */

import { type RunRequest, runRequest } from './pipeline.ts'

function parsePort(argv: string[]): number {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--port') {
      const n = Number(argv[i + 1])
      if (Number.isFinite(n) && n > 0) return n
    } else if (a?.startsWith('--port=')) {
      const n = Number(a.slice('--port='.length))
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  const envPort = Bun.env.PORT ?? process.env.PORT
  if (envPort) {
    const n = Number(envPort)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 3000
}

const port = parsePort(process.argv.slice(2))

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url)

    if (req.method === 'POST' && url.pathname === '/run') {
      let body: RunRequest
      try {
        body = (await req.json()) as RunRequest
      } catch {
        return Response.json(
          { status: 'error', error: 'invalid JSON body' },
          { status: 400 },
        )
      }
      if (!body.request_id || !body.user_query) {
        return Response.json(
          { status: 'error', error: 'request_id and user_query are required' },
          { status: 400 },
        )
      }
      try {
        const response = await runRequest(body)
        return Response.json(response, { status: 200 })
      } catch (err) {
        return Response.json(
          {
            status: 'error',
            error: err instanceof Error ? err.message : 'run failed',
          },
          { status: 500 },
        )
      }
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return Response.json({ ok: true, service: 'conquest-exchange' })
    }

    return new Response('not found', { status: 404 })
  },
})

console.log(`conquest serve listening on http://127.0.0.1:${server.port}`)
