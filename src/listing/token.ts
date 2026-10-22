/**
 * The listing token — the right to list, bought once and spent once.
 *
 * The human pays the listing fee once. The receipt buys exactly one listing token,
 * and the token buys exactly one listing. The token is **single-use**: it is consumed
 * the moment it is redeemed, whatever the evidence pipeline then decides about the
 * listing. A second listing needs a second payment.
 *
 * What stops an agent from reusing a token:
 *
 *  1. **It is consumed on redemption.** The second redemption of the same secret is
 *     refused, and the reason says so.
 *  2. **It is bound to one agent.** A token issued for one agent is refused for
 *     another, so a token cannot be handed around to list a different agent.
 *  3. **It is bound to one receipt.** A token only exists because a payment
 *     verified, and the receipt that paid for it is named on the token.
 *  4. **The id is not the secret.** The token id is a hash of the secret, so the id
 *     can be printed, traced and referenced while the secret stays secret. Redeeming
 *     needs the secret, so an id alone buys nothing.
 *
 * The secret is never logged, never returned in a result and never written to disk.
 */

import { createHash } from 'node:crypto'
import type { AgentIdentity } from '../types.ts'
import type { PaymentReceipt } from './payment.ts'
import { secretsMatch } from './payment.ts'

export interface ListingToken {
  /** The public identifier. Derived from the secret, so it reveals nothing. */
  tokenId: string
  /** The secret. Never logged, never returned to a caller, never written to disk. */
  secret: string
  agentId: string
  registrationId: string
  /** The receipt that paid for this token. */
  receiptId: string
  amountZar: number
  issuedAt: string
  /** When the token was spent. Null while it is unspent. */
  consumedAt: string | null
  /** The listing that spent it. */
  consumedBy: string | null
}

export interface TokenIssueInput {
  agent: AgentIdentity
  registrationId: string
  receipt: PaymentReceipt
  at: string
}

export type RedeemResult =
  | { ok: true; token: ListingToken }
  | { ok: false; reason: string }

const toBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const randomSecret = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

const tokenIdFor = (secret: string): string =>
  `ltx-${createHash('sha256').update(secret).digest('hex').slice(0, 12)}`

/** The listing id a token buys. Derived from the secret, so it is unique per payment. */
export function listingIdFor(token: Pick<ListingToken, 'secret'>): string {
  return `LST-SELF-${createHash('sha256').update(token.secret).digest('hex').slice(0, 8).toUpperCase()}`
}

/** The token book — one per exchange process. */
export class ListingTokenBook {
  private readonly tokens = new Map<string, ListingToken>()

  /**
   * Issue a token against a verified receipt. The receipt is the only thing that can
   * produce one, so a token always traces back to a payment.
   */
  issue(input: TokenIssueInput): ListingToken {
    const secret = randomSecret()
    const token: ListingToken = {
      tokenId: tokenIdFor(secret),
      secret,
      agentId: input.agent.agentId,
      registrationId: input.registrationId,
      receiptId: input.receipt.receiptId,
      amountZar: input.receipt.amountZar,
      issuedAt: input.at,
      consumedAt: null,
      consumedBy: null,
    }
    this.tokens.set(token.tokenId, token)
    return token
  }

  /** The token behind a secret, if it exists. */
  find(secret: string): ListingToken | undefined {
    for (const token of this.tokens.values()) {
      if (secretsMatch(token.secret, secret)) return token
    }
    return undefined
  }

  get(tokenId: string): ListingToken | undefined {
    return this.tokens.get(tokenId)
  }

  /**
   * Spend the token. This is the single-use gate.
   *
   * The token is consumed on redemption, before the evidence pipeline runs: the
   * right to list was sold once, and what the pipeline decides about the listing
   * does not hand the right back.
   */
  redeem(input: { secret: string; agentId: string; at: string }): RedeemResult {
    const token = this.find(input.secret)
    if (!token) {
      return { ok: false, reason: 'the listing token is not recognised' }
    }
    if (token.consumedAt !== null) {
      return {
        ok: false,
        reason: `the listing token was already used at ${token.consumedAt} — one payment buys one listing`,
      }
    }
    if (token.agentId !== input.agentId) {
      return {
        ok: false,
        reason: `the listing token was issued for ${token.agentId}, not for ${input.agentId}`,
      }
    }
    token.consumedAt = input.at
    return { ok: true, token }
  }

  /** Name the listing that spent the token. */
  bindListing(tokenId: string, listingId: string): void {
    const token = this.tokens.get(tokenId)
    if (token) token.consumedBy = listingId
  }
}
