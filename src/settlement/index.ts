/**
 * The settlement surface — the money path, over HTTP.
 *
 *   POST /settle               lock → claim → settle → issue the certificate
 *   GET  /certificate/:id      the issued certificate
 *   GET  /.well-known/avc-jwks.json   the verification key, for a third party
 *
 * This is the product's other face: the listing swarm decides what the evidence
 * supports, and this settles it. The certificate is issued **only** on settlement,
 * and the issued certificate is verifiable by anyone with the published key.
 */

import { Escrow } from '../escrow/index.ts'
import type { EscrowTrade } from '../escrow/index.ts'
import { issueForSettledTrade } from '../avc/certificate.ts'
import { verifyCertificate } from '../avc/verify.ts'
import { CertificateStore } from '../avc/store.ts'
import { jwksDocument } from '../avc/sign.ts'
import type { AgentIdentity } from '../types.ts'

/** One venue, one escrow, one certificate store. */
export const escrow = new Escrow()
export const certificates = new CertificateStore()

export interface SettleRequest {
  trade_id?: string
  listing_id?: string
  amount_zar?: number
  term_months?: number
  buyer?: string
  payment_ref?: string
  who?: Partial<AgentIdentity>
  at?: string
}

/** Run one trade from lock to certificate. Returns the trade and the certificate. */
export async function settleTrade(request: SettleRequest): Promise<{
  trade: EscrowTrade
  certificate: Awaited<ReturnType<typeof issueForSettledTrade>>
}> {
  const listingId = request.listing_id ?? ''
  const amountZar = request.amount_zar ?? 0
  const termMonths = request.term_months ?? 0
  const buyer = request.buyer ?? 'human:anonymous'
  const paymentRef = request.payment_ref ?? ''
  const tradeId = request.trade_id ?? `TRD-${listingId}-${paymentRef}`
  const at = request.at ?? new Date().toISOString()

  if (listingId === '') throw new Error('listing_id is required')
  if (!Number.isInteger(amountZar) || amountZar <= 0) {
    throw new Error('amount_zar must be a whole rand above zero')
  }
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new Error('term_months must be whole months above zero')
  }

  const who: AgentIdentity = {
    agentId: request.who?.agentId ?? 'AGT-UNKNOWN',
    agentKeyHash: request.who?.agentKeyHash ?? 'sha256:unknown',
    walletAddress: request.who?.walletAddress ?? '0x0000000000000000000000000000000000000000',
    displayName: request.who?.displayName ?? 'Unknown agent',
  }

  const trade = escrow.create({
    tradeId,
    listingId,
    amountZar,
    buyer,
    seller: who.agentId,
    paymentRef,
    at,
  })
  escrow.lock(trade.tradeId, at)
  escrow.claim(trade.tradeId, at)
  const settled = escrow.settle(trade.tradeId, at)

  const certificate = await issueForSettledTrade(settled, {
    who,
    method: 'x402',
    listingId,
    termMonths,
    accessGrantedAt: at,
    issuedAt: at,
  })

  certificates.put({
    avc: certificate,
    signature: certificate.proof?.value ?? '',
    tradeId: settled.tradeId,
    issuedAt: certificate.issuedAt,
  })

  return { trade: settled, certificate }
}

/** Verify an issued certificate from its own bytes. */
export async function verifyIssued(certificateId: string): Promise<{
  found: boolean
  valid: boolean
  reasons: string[]
  certificate?: unknown
}> {
  const stored = certificates.get(certificateId)
  if (!stored) return { found: false, valid: false, reasons: ['No such certificate.'] }
  const result = await verifyCertificate(stored.avc)
  return { found: true, valid: result.valid, reasons: result.reasons, certificate: stored.avc }
}

/** The published verification key. Throws when the environment has none. */
export function publishedJwks(): { keys: Array<Record<string, string>> } {
  return jwksDocument()
}
