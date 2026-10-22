/**
 * The x402-shaped payment rail — the human's listing fee.
 *
 * The shape is the x402 shape: the server answers **402 Payment Required** with the
 * payment challenge in the headers, the client pays by signing the exact challenge it
 * was given, and a facilitator verifies the payment before anything else happens.
 *
 * **The facilitator is stubbed locally.** It verifies the shape and the signature, in
 * process, against the payer's own public key. It contacts no chain, no payment
 * provider and no network. That is said here, in the README and in the selftest, so
 * nobody reads "payment verified" as "money moved".
 *
 * The rules this file keeps:
 *  - **Whole rand only.** The asset declares `decimals: 0`, so no cent ever appears
 *    in a challenge.
 *  - **A challenge is single-use.** The facilitator refuses a challenge it has already
 *    verified, so one payment can never buy two listings.
 *  - **The nonce is the receipt's secret.** It is signed, never logged, never carried
 *    on the receipt and never written to disk.
 */

import { createHash, timingSafeEqual } from 'node:crypto'

// ---------------------------------------------------------------------------
// The challenge — the server's side of the rail
// ---------------------------------------------------------------------------

/** What the facilitator is asked to pay. One entry: the exact scheme, one amount. */
export interface PaymentRequirement {
  scheme: 'exact'
  /** `local` — no chain is contacted. The value names a local sink, not an address. */
  network: string
  /** The amount in the asset's smallest unit. The asset declares `decimals: 0`. */
  maxAmountRequired: string
  resource: string
  description: string
  mimeType: string
  payTo: string
  maxTimeoutSeconds: number
  asset: string
  extra: {
    name: string
    version: string
    /** 0 — whole rands only. */
    decimals: number
    challengeId: string
    registrationId: string
  }
}

export interface PaymentChallenge {
  x402Version: 1
  accepts: PaymentRequirement[]
  error: string
}

/** A 402, ready to be returned as an HTTP response. */
export interface PaymentRequest {
  status: 402
  headers: Record<string, string>
  body: PaymentChallenge
  challengeId: string
}

const encoder = new TextEncoder()

const toBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const buffer = Buffer.from(padded, 'base64')
  const out = new Uint8Array(new ArrayBuffer(buffer.byteLength))
  out.set(buffer)
  return out
}

const hash = (value: string): string => createHash('sha256').update(value).digest('hex')

const randomNonce = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

/** The local network name. No chain is contacted, and the name says so. */
export const LOCAL_NETWORK = 'local'
/** The local asset identifier. Not a chain address: no chain is contacted. */
export const LOCAL_ASSET = 'local:ZAR'
/** The local sink for the listing fee. Not a chain address. */
export const LOCAL_PAY_TO = 'local:conquest-listing-fee-sink'

export interface BuildPaymentRequestInput {
  registrationId: string
  /** Whole rands. */
  amountZar: number
  description: string
  resource: string
  at: string
}

/**
 * Build the 402 and the challenge in it.
 *
 * The challenge id is derived from the nonce, so it cannot be guessed and cannot be
 * used to reconstruct the nonce. The nonce itself never leaves the challenge.
 */
export function buildPaymentRequest(input: BuildPaymentRequestInput): PaymentRequest {
  if (!Number.isInteger(input.amountZar) || input.amountZar <= 0) {
    throw new Error('the listing fee is a whole rand, greater than zero')
  }

  const nonce = randomNonce()
  const challengeId = `chal-${hash(nonce).slice(0, 16)}`
  const at = Date.parse(input.at)
  const validAfter = new Date(at).toISOString()
  const validBefore = new Date(at + 10 * 60 * 1000).toISOString()

  const requirement: PaymentRequirement = {
    scheme: 'exact',
    network: LOCAL_NETWORK,
    maxAmountRequired: String(input.amountZar),
    resource: input.resource,
    description: input.description,
    mimeType: 'application/json',
    payTo: LOCAL_PAY_TO,
    maxTimeoutSeconds: 600,
    asset: LOCAL_ASSET,
    extra: {
      name: 'ZAR',
      version: '1',
      decimals: 0,
      challengeId,
      registrationId: input.registrationId,
    },
  }

  const body: PaymentChallenge = { x402Version: 1, accepts: [requirement], error: '' }

  return {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `X402 realm="conquest", scheme="exact", network="${LOCAL_NETWORK}"`,
      'X-Payment-Required': toBase64Url(encoder.encode(JSON.stringify(body))),
    },
    body,
    challengeId,
  }
}

// ---------------------------------------------------------------------------
// The payment — the client's side of the rail
// ---------------------------------------------------------------------------

/** What the client signs. The nonce is inside it, and it is the secret. */
export interface PaymentAuthorization {
  challengeId: string
  from: string
  amount: string
  asset: string
  payTo: string
  resource: string
  network: string
  nonce: string
  validAfter: string
  validBefore: string
}

export interface PaymentResponse {
  x402Version: 1
  scheme: 'exact'
  network: string
  payload: {
    authorization: PaymentAuthorization
    /** base64url Ed25519 signature over the canonical authorization bytes. */
    signature: string
    /** base64url raw Ed25519 public key of the payer. */
    publicKey: string
  }
}

/** The canonical bytes the client signs. Fixed key order. */
export function canonicalizeAuthorization(authorization: PaymentAuthorization): string {
  return JSON.stringify({
    challengeId: authorization.challengeId,
    from: authorization.from,
    amount: authorization.amount,
    asset: authorization.asset,
    payTo: authorization.payTo,
    resource: authorization.resource,
    network: authorization.network,
    nonce: authorization.nonce,
    validAfter: authorization.validAfter,
    validBefore: authorization.validBefore,
  })
}

/** A payer. The keypair is generated in memory and never written down. */
export interface PaymentPayer {
  from: string
  privateKey: CryptoKey
  publicKey: string
}

/** Generate an ephemeral payer keypair. Nothing is stored, nothing is committed. */
export async function createPayer(from: string): Promise<PaymentPayer> {
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as unknown as CryptoKeyPair
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  const publicKey = new Uint8Array(new ArrayBuffer(raw.byteLength))
  publicKey.set(raw)
  return { from, privateKey: pair.privateKey, publicKey: toBase64Url(publicKey) }
}

export interface PaidPayment {
  /** The header the client sends back. */
  header: string
  /** The header name. */
  headerName: string
  response: PaymentResponse
}

/**
 * Pay the challenge.
 *
 * The client signs the challenge the server actually issued: the same amount, the
 * same asset, the same sink, the same resource, and its own nonce. A client cannot
 * pay less than the challenge asks for, because the facilitator compares the signed
 * authorization against the challenge byte for byte.
 */
export async function payChallenge(input: {
  challenge: PaymentChallenge
  payer: PaymentPayer
  at: string
}): Promise<PaidPayment> {
  const requirement = input.challenge.accepts[0]
  if (!requirement) throw new Error('the challenge carries no payment requirement')

  const nonce = randomNonce()
  const at = Date.parse(input.at)

  const authorization: PaymentAuthorization = {
    challengeId: requirement.extra.challengeId,
    from: input.payer.from,
    amount: requirement.maxAmountRequired,
    asset: requirement.asset,
    payTo: requirement.payTo,
    resource: requirement.resource,
    network: requirement.network,
    nonce,
    validAfter: new Date(at).toISOString(),
    validBefore: new Date(at + requirement.maxTimeoutSeconds * 1000).toISOString(),
  }

  const signature = await crypto.subtle.sign(
    'Ed25519',
    input.payer.privateKey,
    encoder.encode(canonicalizeAuthorization(authorization)),
  )

  const response: PaymentResponse = {
    x402Version: 1,
    scheme: 'exact',
    network: requirement.network,
    payload: {
      authorization,
      signature: toBase64Url(new Uint8Array(signature)),
      publicKey: input.payer.publicKey,
    },
  }

  return {
    headerName: 'X-Payment',
    header: toBase64Url(encoder.encode(JSON.stringify(response))),
    response,
  }
}

// ---------------------------------------------------------------------------
// The facilitator — the local stub that verifies the payment
// ---------------------------------------------------------------------------

/** What the facilitator hands back when a payment verifies. It carries no secret. */
export interface PaymentReceipt {
  receiptId: string
  challengeId: string
  amountZar: number
  payer: string
  asset: string
  payTo: string
  resource: string
  verifiedAt: string
  signature: string
}

export interface VerificationResult {
  valid: boolean
  reason: string
  receipt: PaymentReceipt | null
}

const refuse = (reason: string): VerificationResult => ({ valid: false, reason, receipt: null })

/**
 * The facilitator. **A local stub with a real verification.**
 *
 * It checks four things, in order: the response answers the challenge that was
 * issued, the signed authorization matches the challenge exactly, the signature
 * verifies against the payer's own public key, and the challenge has not been paid
 * before. The last check is what makes "pay once" true at the payment layer.
 *
 * It contacts nothing. There is no chain, no provider and no key of ours in the
 * path — the payer signs with a key it generated in memory for this run.
 */
export class LocalFacilitator {
  private readonly paid = new Set<string>()

  async verify(input: {
    challenge: PaymentChallenge
    response: PaymentResponse
    at: string
  }): Promise<VerificationResult> {
    const requirement = input.challenge.accepts[0]
    if (!requirement) return refuse('the challenge carries no payment requirement')

    const { authorization, signature, publicKey } = input.response.payload

    if (input.response.scheme !== requirement.scheme || input.response.network !== requirement.network) {
      return refuse('the payment does not answer the scheme and network of the challenge')
    }

    if (authorization.challengeId !== requirement.extra.challengeId) {
      return refuse('the payment answers a different challenge')
    }

    if (this.paid.has(requirement.extra.challengeId)) {
      return refuse('this challenge was already paid — one payment buys one listing')
    }

    if (
      authorization.amount !== requirement.maxAmountRequired ||
      authorization.asset !== requirement.asset ||
      authorization.payTo !== requirement.payTo ||
      authorization.resource !== requirement.resource ||
      authorization.network !== requirement.network
    ) {
      return refuse('the signed payment does not match the amount, asset, sink and resource of the challenge')
    }

    if (authorization.nonce === '') return refuse('the payment carries no nonce')

    const valid = await verifyAuthorization(authorization, signature, publicKey)
    if (!valid) return refuse('the signature does not verify against the payer public key')

    this.paid.add(requirement.extra.challengeId)

    return {
      valid: true,
      reason: 'the payment matches the challenge and the signature verifies against the payer public key',
      receipt: {
        receiptId: `rcp-${hash(`${requirement.extra.challengeId}|${signature}`).slice(0, 16)}`,
        challengeId: requirement.extra.challengeId,
        amountZar: Number(requirement.maxAmountRequired),
        payer: authorization.from,
        asset: requirement.asset,
        payTo: requirement.payTo,
        resource: requirement.resource,
        verifiedAt: input.at,
        signature,
      },
    }
  }
}

/** Verify a detached Ed25519 signature over the canonical authorization bytes. */
export async function verifyAuthorization(
  authorization: PaymentAuthorization,
  signature: string,
  publicKey: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      fromBase64Url(publicKey),
      { name: 'Ed25519' },
      true,
      ['verify'],
    )
    return await crypto.subtle.verify(
      'Ed25519',
      key,
      fromBase64Url(signature),
      encoder.encode(canonicalizeAuthorization(authorization)),
    )
  } catch {
    return false
  }
}

/** Compare two secrets without leaking their contents through timing. */
export function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.byteLength !== right.byteLength) return false
  return timingSafeEqual(left, right)
}
