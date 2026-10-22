/**
 * The listing closer — propose, then publish or hold.
 *
 * The closer writes the canonical record and the copy that goes with it. Its copy may
 * not claim more than the evidence supports: no "guaranteed", no "risk-free", no
 * valuation language. It states the price, the term, and where the evidence came
 * from — and when the evidence does not support the claim, it says so instead of
 * publishing.
 *
 * The canonical record is content-addressed: the same content always yields the same
 * id, so a record can be referenced without a database.
 */

import { createHash } from 'node:crypto'
import type { Critique, Listing, ListingRecord } from '../types.ts'
import type { CloseResult, Reconciliation } from './contracts.ts'

const PRICE_FIELD = 'priceZar'
const TERM_FIELD = 'termMonths'

const contentIdFor = (parts: string[]): string =>
  `cid-${createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24)}`

export interface DraftResult {
  /** The canonical draft record — loop 1's proposal, before the critic sees it. */
  record: ListingRecord
  contentId: string
  listingCopy: string
}

/** Loop 1: the draft proposal, written before anything challenges it. */
export function proposeListing(listing: Listing, recon: Reconciliation): DraftResult {
  const price = recon.values[PRICE_FIELD]
  const contentId = contentIdFor([
    listing.listingId,
    listing.agent.agentId,
    String(listing.declaredPriceZar),
    String(listing.termMonths),
    'draft',
    JSON.stringify(recon.provenance),
  ])

  const reconciled = Object.keys(recon.values)
    .sort()
    .map((field) => `${field} = ${recon.values[field]} (${recon.provenance[field]})`)
    .join('; ')

  const copy =
    price === undefined
      ? `Draft. R${listing.declaredPriceZar} for ${listing.termMonths} months as declared — ` +
        'no independent evidence has answered yet.'
      : `Draft. R${listing.declaredPriceZar} for ${listing.termMonths} months as declared. ` +
        `Reconciled evidence: ${reconciled}.`

  return {
    contentId,
    listingCopy: copy,
    record: {
      listingId: listing.listingId,
      agent: listing.agent,
      declaredPriceZar: listing.declaredPriceZar,
      reconciledPriceZar: price === undefined ? null : Number(price),
      status: 'draft',
      provenance: recon.provenance,
      contentId,
      recordedAt: '',
    },
  }
}

/** Loop 2's end: the decision, the canonical record, and the copy. */
export function closeListing(
  listing: Listing,
  critique: Critique,
  recon: Reconciliation,
): CloseResult {
  const fallback = recon.unavailable.length > 0
  const corroborating = recon.corroborated[PRICE_FIELD] ?? []

  if (critique.verdict === 'hold') {
    const contentId = contentIdFor([
      listing.listingId,
      listing.agent.agentId,
      String(listing.declaredPriceZar),
      'held',
      JSON.stringify(recon.provenance),
    ])
    return {
      status: 'held',
      reconciledPriceZar: null,
      provenance: recon.provenance,
      contentId,
      revised: null,
      fallback,
      listingCopy:
        `Held. The declared price of R${listing.declaredPriceZar} is not supported by the ` +
        `reconciled evidence. ${critique.reason}`,
    }
  }

  let revised: CloseResult['revised'] = null
  let term = listing.termMonths

  if (critique.verdict === 'revise') {
    const supportedTerm = recon.values[TERM_FIELD]
    if (supportedTerm !== undefined) {
      revised = { field: TERM_FIELD, from: String(listing.termMonths), to: supportedTerm }
      term = Number(supportedTerm)
    }
  }

  const contentId = contentIdFor([
    listing.listingId,
    listing.agent.agentId,
    String(listing.declaredPriceZar),
    String(term),
    'published',
    JSON.stringify(recon.provenance),
  ])

  const sourceNote =
    recon.provenance[PRICE_FIELD] !== undefined
      ? ` (evidence: ${corroborating.length > 1 ? corroborating.join(', ') : recon.provenance[PRICE_FIELD]})`
      : ''
  const caveat = fallback
    ? ' Published on the available evidence only — one source did not answer.'
    : ''

  return {
    status: 'published',
    reconciledPriceZar: listing.declaredPriceZar,
    provenance: recon.provenance,
    contentId,
    revised,
    fallback,
    listingCopy:
      `R${listing.declaredPriceZar} for ${term} months${sourceNote}.` +
      (revised !== null
        ? ` The ${revised.field} was revised to ${revised.to} to match the evidence.`
        : '') +
      caveat,
  }
}

/** The canonical record the World Model log carries. */
export function toListingRecord(listing: Listing, close: CloseResult, at: string): ListingRecord {
  return {
    listingId: listing.listingId,
    agent: listing.agent,
    declaredPriceZar: listing.declaredPriceZar,
    reconciledPriceZar: close.reconciledPriceZar,
    status: close.status,
    provenance: close.provenance,
    contentId: close.contentId,
    recordedAt: at,
  }
}
