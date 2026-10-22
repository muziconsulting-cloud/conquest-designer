/**
 * Build the certificate — from a **settled** trade and nothing else.
 *
 * The Agentic Valuation Certificate certifies exactly three facts:
 *
 *   1. who       — the agentic identity in the wallet that owns the listing,
 *   2. what was paid — the amount, the currency and the payment reference,
 *   3. what it bought — the listing and the access term.
 *
 * It is not a valuation: the amount is the owner's declared price, recorded as
 * declared, never appraised. It is not a token: it is a signed document.
 *
 * **Issue on settlement, not on listing.** A published listing has no certificate.
 * A held listing has no certificate. Only a settled trade has one, and the
 * certificate refuses to be built from anything else.
 */

import type { AgentIdentity, Avc, CertificateId, ListingId, TradeId } from '../types.ts'
import type { EscrowTrade } from '../escrow/index.ts'
import { canonicalizePayload, deriveCertificateId } from './canonical.ts'
import type { AttestedBody } from './canonical.ts'
import type { AvcPayload } from './canonical.ts'
import { keyId, readPublicKey, signPayload } from './sign.ts'

/** Where a third party fetches the verification key. */
export const AVC_JWKS_PATH = '/.well-known/avc-jwks.json'

export interface CertificateInput {
  tradeId: TradeId
  who: AgentIdentity
  amountZar: number
  paidAt: string
  method: 'x402' | 'escrow'
  paymentRef: string
  listingId: ListingId
  termMonths: number
  accessGrantedAt: string
  issuedAt: string
}

/** The payload — the exact fields that get signed. */
export function buildPayload(input: CertificateInput): AvcPayload {
  if (!Number.isInteger(input.amountZar) || input.amountZar <= 0) {
    throw new Error('The amount must be a whole rand above zero. No cents, ever.')
  }
  if (!Number.isInteger(input.termMonths) || input.termMonths <= 0) {
    throw new Error('The term must be whole months above zero.')
  }
  if (input.paymentRef.trim() === '') {
    throw new Error('A certificate cannot be issued without a payment reference.')
  }
  return {
    tradeId: input.tradeId,
    who: {
      agentId: input.who.agentId,
      agentKeyHash: input.who.agentKeyHash,
      walletAddress: input.who.walletAddress,
      displayName: input.who.displayName,
    },
    paid: {
      amountZar: input.amountZar,
      currency: 'ZAR',
      declaredByOwner: true,
      paidAt: input.paidAt,
      method: input.method,
      paymentRef: input.paymentRef,
    },
    bought: {
      listingId: input.listingId,
      termMonths: input.termMonths,
      accessGrantedAt: input.accessGrantedAt,
    },
  }
}

/** The three facts, as they appear on the certificate body. */
export function bodyFromPayload(payload: AvcPayload): AttestedBody {
  return {
    who: { ...payload.who },
    whatWasPaid: {
      amountZar: payload.paid.amountZar,
      currency: payload.paid.currency,
      declaredByOwner: payload.paid.declaredByOwner,
      paidAt: payload.paid.paidAt,
      method: payload.paid.method,
    },
    whatItBought: { ...payload.bought },
  }
}

/** The unsigned certificate. The proof is filled in by `issueCertificate`. */
export function buildCertificate(payload: AvcPayload, issuedAt: string): Avc {
  const body = bodyFromPayload(payload)
  return {
    certificateId: deriveCertificateId(payload, body),
    who: {
      agentId: body.who.agentId,
      agentKeyHash: body.who.agentKeyHash,
      walletAddress: body.who.walletAddress,
      displayName: body.who.displayName,
    },
    whatWasPaid: { ...body.whatWasPaid },
    whatItBought: { ...body.whatItBought },
    issuedAt,
    proof: {
      alg: 'EdDSA',
      kid: keyId(readPublicKey()),
      value: '',
      verify: AVC_JWKS_PATH,
      payload: payload as unknown as Record<string, unknown>,
    },
  }
}

/** Build and sign. The signature is detached, over the canonical payload bytes. */
export async function issueCertificate(input: CertificateInput): Promise<Avc> {
  const payload = buildPayload(input)
  const avc = buildCertificate(payload, input.issuedAt)
  const signature = await signPayload(payload)
  if (avc.proof) avc.proof.value = signature
  return avc
}

/**
 * Issue from a **settled** escrow trade.
 *
 * This is the gate: an unsettled trade — pending, in suspense, claimed but not
 * settled, or cancelled — cannot produce a certificate. A certificate that names a
 * payment that has not settled is invalid, and the code refuses to make one.
 */
export async function issueForSettledTrade(
  trade: EscrowTrade,
  input: Omit<CertificateInput, 'tradeId' | 'amountZar' | 'paidAt' | 'paymentRef'>,
): Promise<Avc> {
  if (trade.state !== 'settled') {
    throw new Error(
      `The certificate is issued on settlement, not on listing. Trade ${trade.tradeId} is "${trade.state}".`,
    )
  }
  if (!trade.settledAt) {
    throw new Error(`Trade ${trade.tradeId} claims to be settled but carries no settlement time.`)
  }
  return issueCertificate({
    ...input,
    tradeId: trade.tradeId,
    amountZar: trade.amountZar,
    paidAt: trade.settledAt,
    paymentRef: trade.paymentRef,
  })
}

/** The canonical bytes of a certificate's payload — what a verifier re-derives. */
export function payloadBytes(avc: Avc): string {
  const payload = avc.proof?.payload as unknown as AvcPayload | undefined
  if (!payload) throw new Error('This certificate carries no signed payload.')
  return canonicalizePayload(payload)
}

export type { CertificateId }
