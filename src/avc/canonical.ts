/**
 * Canonical serialization for the AVC.
 *
 * The certificate is signed over a **payload** — the exact fields the certificate
 * attests. The payload is canonicalized deterministically (fixed key order, no
 * whitespace), so:
 *
 *   - the same settled trade always produces the same bytes, and therefore the same
 *     certificate id;
 *   - a tampered certificate produces different bytes, and therefore a different id.
 *
 * The id is derived from the **payload**, not from the issue timestamp: two
 * certificates for the same settled trade are the same certificate.
 */

import type { CertificateId } from '../types.ts'
import { createHash } from 'node:crypto'

/** The exact fields the certificate signs. Three facts, and the trade they came from. */
export interface AvcPayload {
  tradeId: string
  who: {
    agentId: string
    agentKeyHash: string
    walletAddress: string
    displayName: string
  }
  paid: {
    amountZar: number
    currency: 'ZAR'
    declaredByOwner: boolean
    paidAt: string
    method: 'x402' | 'escrow'
    paymentRef: string
  }
  bought: {
    listingId: string
    termMonths: number
    accessGrantedAt: string
  }
}

/** The canonical bytes. Fixed key order — never built from object key order. */
export function canonicalizePayload(payload: AvcPayload): string {
  return JSON.stringify({
    tradeId: payload.tradeId,
    who: {
      agentId: payload.who.agentId,
      agentKeyHash: payload.who.agentKeyHash,
      walletAddress: payload.who.walletAddress,
      displayName: payload.who.displayName,
    },
    paid: {
      amountZar: payload.paid.amountZar,
      currency: payload.paid.currency,
      declaredByOwner: payload.paid.declaredByOwner,
      paidAt: payload.paid.paidAt,
      method: payload.paid.method,
      paymentRef: payload.paid.paymentRef,
    },
    bought: {
      listingId: payload.bought.listingId,
      termMonths: payload.bought.termMonths,
      accessGrantedAt: payload.bought.accessGrantedAt,
    },
  })
}

export function contentHash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** The three facts as they appear on the certificate body. */
export interface AttestedBody {
  who: {
    agentId: string
    agentKeyHash: string
    walletAddress: string
    displayName: string
  }
  whatWasPaid: {
    amountZar: number
    currency: 'ZAR'
    declaredByOwner: boolean
    paidAt: string
    method: 'x402' | 'escrow'
  }
  whatItBought: {
    listingId: string
    termMonths: number
    accessGrantedAt: string
  }
}

/** The canonical bytes of the certificate body. Fixed key order. */
export function canonicalizeBody(body: AttestedBody): string {
  return JSON.stringify({
    who: {
      agentId: body.who.agentId,
      agentKeyHash: body.who.agentKeyHash,
      walletAddress: body.who.walletAddress,
      displayName: body.who.displayName,
    },
    whatWasPaid: {
      amountZar: body.whatWasPaid.amountZar,
      currency: body.whatWasPaid.currency,
      declaredByOwner: body.whatWasPaid.declaredByOwner,
      paidAt: body.whatWasPaid.paidAt,
      method: body.whatWasPaid.method,
    },
    whatItBought: {
      listingId: body.whatItBought.listingId,
      termMonths: body.whatItBought.termMonths,
      accessGrantedAt: body.whatItBought.accessGrantedAt,
    },
  })
}

/**
 * The certificate id: content-derived.
 *
 * It covers **both** the signed payload and the certificate body, so a certificate
 * that was edited in either place no longer derives its own id — and the same
 * settled trade always derives the same one.
 */
export function deriveCertificateId(payload: AvcPayload, body: AttestedBody): CertificateId {
  const canonical = `${canonicalizePayload(payload)}|${canonicalizeBody(body)}`
  return `avc-${contentHash(canonical).slice(0, 24)}` as CertificateId
}
