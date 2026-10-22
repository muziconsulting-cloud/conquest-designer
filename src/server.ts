/**
 * `bun run serve` — the HTTP surface.
 *
 * `POST /run` is the programmatic entry point: a judge can call it without clicking
 * anything. The response is the same contract the CLI writes to disk.
 *
 * The listing routes carry the money path in: a human registers, the server answers
 * **402** with the x402 challenge, the client pays, the receipt becomes a listing
 * token, and the agent spends that token to list itself. The facilitator that
 * verifies the payment is a **local stub** — it checks the request shape and the
 * signature in process, and contacts no chain and no provider.
 */

import { runExchange } from './orchestrator/index.ts'
import { createTraceSink } from './orchestrator/trace.ts'
import { settleTrade, verifyIssued, publishedJwks } from './settlement/index.ts'
import { ListingRegistry, registerAgent } from './listing/register.ts'
import { ListingTokenBook } from './listing/token.ts'
import { LocalFacilitator } from './listing/payment.ts'
import type { PaymentChallenge, PaymentResponse } from './listing/payment.ts'
import { selfList } from './listing/self-list.ts'
import { RECEIVING_ADDRESS, VENUE_NAME } from './venue.ts'
import { renderHome } from './pages/index.ts'
import { renderListing, renderListingMissing, renderListings } from './pages/listings.ts'
import { renderCertificate } from './pages/avc.ts'
import { renderAgents } from './pages/agents.ts'
import { renderTrace } from './pages/trace.ts'
import { getListing } from './pages/data.ts'
import type { AgentIdentity } from './types.ts'

/** The listing state of this process. One registry, one token book, one facilitator. */
const listings = {
  registry: new ListingRegistry(),
  tokens: new ListingTokenBook(),
  facilitator: new LocalFacilitator(),
  /** The challenges this process issued, by challenge id. */
  challenges: new Map<string, PaymentChallenge>(),
}

const decodeBase64Url = (value: string): string =>
  Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')

/** A page of HTML. */
const html = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })


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

    // ---- The operator surface — server-rendered HTML ------------------------
    // Every page is readable from its HTML alone. No hydration, no SPA, no
    // client-side data fetch for the first paint.
    if (request.method === 'GET') {
      if (url.pathname === '/') {
        return html(renderHome())
      }
      if (url.pathname === '/listings') {
        return html(renderListings())
      }
      if (url.pathname.startsWith('/listing/')) {
        const listingId = decodeURIComponent(url.pathname.slice('/listing/'.length))
        const listing = getListing(listingId)
        if (!listing) {
          return html(
            renderListingMissing(listingId),
            404,
          )
        }
        return html(renderListing(listing))
      }
      if (url.pathname.startsWith('/avc/')) {
        const certificateId = decodeURIComponent(url.pathname.slice('/avc/'.length))
        const rendered = await renderCertificate(certificateId)
        return html(rendered.html, rendered.status)
      }
      if (url.pathname === '/agents') {
        return html(renderAgents())
      }
      if (url.pathname === '/trace') {
        return html(renderTrace(url.searchParams.get('run')))
      }
    }

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
            received_at: RECEIVING_ADDRESS,
            received_by: VENUE_NAME,
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

    // Register an agent and open the listing-fee payment. The answer is a 402 with
    // the x402 challenge in the headers — the real shape, a local facilitator.
    if (url.pathname === '/listing/register' && request.method === 'POST') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return Response.json({ error: 'the request body is not JSON' }, { status: 400 })
      }
      const payload = body as { agent?: AgentIdentity; owner?: string }
      if (!payload.agent?.agentId || !payload.agent?.walletAddress) {
        return Response.json({ error: 'agent.agentId and agent.walletAddress are required' }, { status: 400 })
      }
      const resource = new URL('/listing/register', url.origin).toString()
      const { registration, payment } = registerAgent({
        registry: listings.registry,
        agent: payload.agent,
        owner: payload.owner ?? 'human:anonymous',
        resource,
        at: new Date().toISOString(),
      })
      listings.challenges.set(payment.challengeId, payment.body)
      return new Response(
        JSON.stringify({ registration_id: registration.registrationId, challenge: payment.body }),
        { status: 402, headers: payment.headers },
      )
    }

    // Pay the challenge. The client sends the signed payment back in the X-Payment
    // header; the local facilitator verifies it and the receipt becomes a token.
    if (url.pathname === '/listing/pay' && request.method === 'POST') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return Response.json({ error: 'the request body is not JSON' }, { status: 400 })
      }
      const payload = body as { challenge_id?: string }
      const header = request.headers.get('x-payment')
      if (!payload.challenge_id || !header) {
        return Response.json(
          { error: 'challenge_id and the X-Payment header are required' },
          { status: 400 },
        )
      }
      const challenge = listings.challenges.get(payload.challenge_id)
      if (!challenge) {
        return Response.json({ error: 'the challenge is not known to this process' }, { status: 404 })
      }
      let response: PaymentResponse
      try {
        response = JSON.parse(decodeBase64Url(header)) as PaymentResponse
      } catch {
        return Response.json({ error: 'the X-Payment header is not a payment' }, { status: 400 })
      }
      const at = new Date().toISOString()
      const verified = await listings.facilitator.verify({ challenge, response, at })
      if (!verified.valid || !verified.receipt) {
        return Response.json({ error: verified.reason }, { status: 402 })
      }
      const registrationId = challenge.accepts[0]?.extra.registrationId ?? ''
      listings.registry.markPaid(registrationId, verified.receipt)
      const token = listings.tokens.issue({
        agent: listings.registry.get(registrationId)?.agent ?? {
          agentId: '',
          agentKeyHash: '',
          walletAddress: '',
          displayName: '',
        },
        registrationId,
        receipt: verified.receipt,
        at,
      })
      return Response.json({
        receipt: {
          receipt_id: verified.receipt.receiptId,
          payer: verified.receipt.payer,
          amount_zar: verified.receipt.amountZar,
          asset: verified.receipt.asset,
          verified_at: verified.receipt.verifiedAt,
        },
        listing_token: { token_id: token.tokenId, token: token.secret },
        received_at: RECEIVING_ADDRESS,
        note: 'the facilitator is a local stub — no chain and no provider was contacted',
      })
    }

    // The agent lists itself. The token is the right to list, once.
    if (url.pathname === '/listing/self-list' && request.method === 'POST') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return Response.json({ error: 'the request body is not JSON' }, { status: 400 })
      }
      const payload = body as {
        registration_id?: string
        token?: string
        declared_price_zar?: number
        term_months?: number
      }
      if (!payload.registration_id || !payload.token) {
        return Response.json(
          { error: 'registration_id and token are required' },
          { status: 400 },
        )
      }
      const result = await selfList({
        registry: listings.registry,
        tokens: listings.tokens,
        registrationId: payload.registration_id,
        secret: payload.token,
        declaredPriceZar: Number(payload.declared_price_zar),
        termMonths: Number(payload.term_months ?? 12),
      })
      if (!result.ok) {
        return Response.json({ error: result.reason, listing_id: result.listingId }, { status: 409 })
      }
      return Response.json({
        listing_id: result.listingId,
        token_id: result.tokenId,
        declared_price_zar: result.declaredPriceZar,
        reconciled_price_zar: result.reconciledPriceZar,
        decision: result.decision,
        status: result.status,
        listing_copy: result.listingCopy,
        content_id: result.contentId,
        sources: result.sources,
        pull: result.pull,
        trace: result.tracePath,
      })
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
