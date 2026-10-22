/**
 * Verify a certificate **without consulting the issuer**.
 *
 * A verifier needs three things and nothing else:
 *
 *   1. the certificate (and the detached signature it carries),
 *   2. the public key — fetched from the published JWKS, or handed to us,
 *   3. the rules, which are in this file.
 *
 * It never asks the issuer whether the certificate is "real" in their database. It
 * checks four things, and each of them is a reason to refuse:
 *
 *   - the certificate carries a signed payload and a detached signature;
 *   - the certificate's three facts are the facts the payload signs — a certificate
 *     whose body was edited after signing is refused;
 *   - the certificate id is the id those payload bytes derive — a certificate whose
 *     id was edited is refused;
 *   - the signature verifies over the canonical payload bytes.
 */

import type { Avc } from '../types.ts'
import type { AvcPayload } from './canonical.ts'
import { canonicalizePayload, deriveCertificateId } from './canonical.ts'
import type { AttestedBody } from './canonical.ts'
import { keyId, readPublicKey, verifySignature } from './sign.ts'

export interface VerificationResult {
  valid: boolean
  /** Every reason the certificate was refused. Empty when it is valid. */
  reasons: string[]
}

export interface VerifyOptions {
  /** The public key, base64url. Falls back to the environment. */
  publicKey?: string
  /** A JWKS document — the key is picked by its `kid`. */
  jwks?: { keys: Array<Record<string, string>> }
}

const payloadOf = (avc: Avc): AvcPayload | undefined =>
  avc.proof?.payload as unknown as AvcPayload | undefined

/** The three facts of the certificate body must be the facts the payload signs. */
function bodyMatchesPayload(avc: Avc, payload: AvcPayload): boolean {
  const who =
    avc.who.agentId === payload.who.agentId &&
    avc.who.agentKeyHash === payload.who.agentKeyHash &&
    avc.who.walletAddress === payload.who.walletAddress
  const paid =
    avc.whatWasPaid.amountZar === payload.paid.amountZar &&
    avc.whatWasPaid.currency === payload.paid.currency &&
    avc.whatWasPaid.declaredByOwner === payload.paid.declaredByOwner &&
    avc.whatWasPaid.paidAt === payload.paid.paidAt &&
    avc.whatWasPaid.method === payload.paid.method
  const bought =
    avc.whatItBought.listingId === payload.bought.listingId &&
    avc.whatItBought.termMonths === payload.bought.termMonths &&
    avc.whatItBought.accessGrantedAt === payload.bought.accessGrantedAt
  return who && paid && bought
}

/** The key, from the JWKS by kid, from the options, or from the environment. */
function resolveKey(avc: Avc, options: VerifyOptions): string | undefined {
  const kid = avc.proof?.kid
  if (options.jwks && kid) {
    const found = options.jwks.keys.find((key) => key.kid === kid)
    if (found?.x) return found.x
  }
  if (options.publicKey) return options.publicKey
  try {
    return readPublicKey()
  } catch {
    return undefined
  }
}

/** Verify. Returns true/false and the reasons, never throws. */
export async function verifyCertificate(
  avc: Avc,
  options: VerifyOptions = {},
): Promise<VerificationResult> {
  const reasons: string[] = []

  const payload = payloadOf(avc)
  if (!payload) {
    return { valid: false, reasons: ['The certificate carries no signed payload.'] }
  }
  if (!avc.proof?.value) {
    reasons.push('The certificate carries no detached signature.')
  }
  if (!bodyMatchesPayload(avc, payload)) {
    reasons.push('The certificate body does not match the signed payload — it was edited after signing.')
  }
  const body: AttestedBody = {
    who: { ...avc.who },
    whatWasPaid: { ...avc.whatWasPaid },
    whatItBought: { ...avc.whatItBought },
  }
  if (avc.certificateId !== deriveCertificateId(payload, body)) {
    reasons.push('The certificate id is not the id its content derives — it was edited.')
  }

  const key = resolveKey(avc, options)
  if (!key) {
    reasons.push('No verification key: fetch the issuer JWKS or pass the public key.')
    return { valid: false, reasons }
  }
  if (avc.proof?.kid && avc.proof.kid !== keyId(key)) {
    reasons.push('The signature was not made by the key this certificate names.')
  }

  if (avc.proof?.value) {
    const signatureOk = await verifySignature(payload, avc.proof.value, key)
    if (!signatureOk) {
      reasons.push('The signature does not verify over the canonical payload bytes.')
    }
  }

  return { valid: reasons.length === 0, reasons }
}

/** Verify a detached signature against a payload and a key, on its own. */
export async function verifyDetached(
  payload: AvcPayload,
  signature: string,
  publicKey: string,
): Promise<boolean> {
  return verifySignature(payload, signature, publicKey)
}

export { canonicalizePayload, deriveCertificateId }
export type { AvcPayload }
