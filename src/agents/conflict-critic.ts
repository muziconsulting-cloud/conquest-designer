/**
 * The conflict critic — the adversarial role.
 *
 * The critic is authoritative. It compares the reconciled evidence against the
 * claim, and it does not soften:
 *
 *  - the price is not supported by the independent evidence -> **hold**
 *  - the price is supported but another term disagrees -> **revise**
 *  - everything agrees -> **accept**
 *
 * A critic that never holds anything is a broken critic. Holding is a success.
 */

import type { Critique, Listing } from '../types.ts'
import type { Reconciliation } from './contracts.ts'

const PRICE_FIELD = 'priceZar'
const TERM_FIELD = 'termMonths'

export function critiqueListing(listing: Listing, recon: Reconciliation): Critique {
  const declaredPrice = String(listing.declaredPriceZar)
  const declaredTerm = String(listing.termMonths)

  const supportedPrice = recon.values[PRICE_FIELD]
  if (supportedPrice === undefined) {
    return {
      verdict: 'hold',
      reason: `No independent source supports the declared price of R${declaredPrice}.`,
      conflicts: recon.conflicts,
      supportingMemoryIds: recon.memoryIds,
    }
  }

  if (supportedPrice !== declaredPrice) {
    return {
      verdict: 'hold',
      reason:
        `The reconciled evidence supports R${supportedPrice} (${recon.provenance[PRICE_FIELD]}), ` +
        `not the declared R${declaredPrice}. The listing is held, not published.`,
      conflicts: recon.conflicts,
      supportingMemoryIds: recon.memoryIds,
    }
  }

  const supportedTerm = recon.values[TERM_FIELD]
  if (supportedTerm !== undefined && supportedTerm !== declaredTerm) {
    return {
      verdict: 'revise',
      reason:
        `The price agrees (R${declaredPrice}), but the term does not: the evidence says ` +
        `${supportedTerm} months (${recon.provenance[TERM_FIELD]}), the declaration says ` +
        `${declaredTerm}. Revise the term and publish.`,
      conflicts: recon.conflicts,
      supportingMemoryIds: recon.memoryIds,
    }
  }

  const corroborating = recon.corroborated[PRICE_FIELD] ?? []
  const single = corroborating.length === 1
  return {
    verdict: 'accept',
    reason:
      `The reconciled evidence supports the declared price of R${declaredPrice}` +
      ` (${recon.provenance[PRICE_FIELD]})` +
      (single
        ? `, on the one source that answered. The other source did not answer, so the ` +
          `listing is published on degraded evidence.`
        : `, confirmed by ${corroborating.length} independent sources.`),
    conflicts: recon.conflicts,
    supportingMemoryIds: recon.memoryIds,
  }
}
