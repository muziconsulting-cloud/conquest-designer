/**
 * `bun run serve` — the HTTP surface.
 *
 * `POST /run` is the programmatic entry point: a judge can call it without clicking
 * anything. The response is the same contract the CLI writes to disk.
 */

import { runExchange } from './orchestrator/index.ts'
import { createTraceSink } from './orchestrator/trace.ts'
import { settleTrade, verifyIssued, publishedJwks } from './settlement/index.ts'

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

    // The verification key, published so a third party can verify a certificate
    // without trusting us.
    if (url.pathname === '/.well-known/avc-jwks.json' && request.method === 'GET') {
      try {
        return Response.json(publishedJwks())
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : 'no verification key is configured' },
          { status: 501 },
        )
      }
    }

    // Settle a trade: lock -> claim -> seller paid -> certificate issued.
    if (url.pathname === '/settle' && request.method === 'POST') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return Response.json({ error: 'the request body is not JSON' }, { status: 400 })
      }
      try {
        const { trade, certificate } = await settleTrade(body as Record<string, never>)
        return Response.json({
          trade: {
            trade_id: trade.tradeId,
            listing_id: trade.listingId,
            state: trade.state,
            amount_zar: trade.amountZar,
            payment_ref: trade.paymentRef,
            settled_at: trade.settledAt,
          },
          certificate,
        })
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : 'the trade could not be settled' },
          { status: 400 },
        )
      }
    }

    // Look up an issued certificate, and verify it from its own bytes.
    if (url.pathname.startsWith('/certificate/') && request.method === 'GET') {
      const certificateId = decodeURIComponent(url.pathname.slice('/certificate/'.length))
      const result = await verifyIssued(certificateId)
      if (!result.found) return Response.json(result, { status: 404 })
      return Response.json(result)
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
