/**
 * `bun run serve` — the HTTP surface.
 *
 * `POST /run` is the programmatic entry point: a judge can call it without clicking
 * anything. The response is the same contract the CLI writes to disk.
 */

import { runExchange } from './orchestrator/index.ts'
import { createTraceSink } from './orchestrator/trace.ts'

const args = process.argv.slice(2)
let port = 3000
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index] ?? ''
  if (arg === '--port') port = Number(args[index + 1])
  else if (arg.startsWith('--port=')) port = Number(arg.slice('--port='.length))
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'conquest-exchange' })
    }

    if (url.pathname === '/run' && request.method === 'POST') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return Response.json({ error: 'the request body is not JSON' }, { status: 400 })
      }

      const payload = body as {
        request_id?: string
        user_query?: string
        context?: Record<string, unknown>
      }

      // Shape validation only — the run never branches on the question's wording.
      const { request_id: requestId, user_query: userQuery, context } = payload
      if (typeof requestId !== 'string' || typeof userQuery !== 'string') {
        return Response.json(
          { error: 'request_id and user_query are required' },
          { status: 400 },
        )
      }

      const response = await runExchange({
        request: {
          request_id: requestId,
          user_query: userQuery,
          context: context ?? {},
        },
        trace: createTraceSink(),
      })

      return Response.json(response)
    }

    return new Response('not found', { status: 404 })
  },
})

console.log(`conquest-exchange listening on http://127.0.0.1:${server.port}`)
