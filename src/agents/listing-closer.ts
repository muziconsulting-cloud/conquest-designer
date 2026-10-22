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
 *
 * The record itself is written to the **World Model** engine (Meterless) — the listing
 * as an entity, the agent it belongs to as another entity, the relation between them,
 * and the facts the listing asserts. Every write carries its provenance, the event log
 * keeps the order, and the audit trail keeps the receipt.
 */

import { createHash } from 'node:crypto'
import type { Critique, Listing, ListingRecord } from '../types.ts'
import type { CloseResult, Reconciliation } from './contracts.ts'
import type { EngineSession } from '../engines/session.ts'

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

export interface RecordInput {
  listing: Listing
  close: CloseResult
  recon: Reconciliation
  session: EngineSession
  at: string
}

export interface RecordResult {
  /** The World Model's id for the listing entity. */
  entityId: string
  /** The World Model's id for the agent entity. */
  agentEntityId: string
  /** The events the writes produced, in order. */
  eventIds: string[]
  /** The audit sequence the record ends on. */
  auditSeq: number
}

/**
 * Write the listing into the canonical log.
 *
 * The listing is keyed by its content id, so the same listing always lands on the
 * same entity and re-writing it is a no-op. The agent is keyed by its agent id — an
 * agentic identity we reference, never one we mint.
 */
export async function recordListing(input: RecordInput): Promise<RecordResult> {
  const { listing, close, recon, session, at } = input
  const world = session.world

  const source = {
    kind: 'observed',
    at,
    agent: 'listing-closer',
    listing: listing.listingId,
  }

  const agent = await world.upsertEntity({
    type: 'agent',
    name: listing.agent.displayName,
    externalKey: { system: 'conquest', id: listing.agent.agentId },
    attrs: {
      agentId: listing.agent.agentId,
      agentKeyHash: listing.agent.agentKeyHash,
      walletAddress: listing.agent.walletAddress,
    },
    source,
    confidence: 1,
  })

  const entity = await world.upsertEntity({
    type: 'listing',
    name: `${listing.agent.displayName} — R${listing.declaredPriceZar} / ${listing.termMonths} months`,
    externalKey: { system: 'conquest', id: close.contentId },
    attrs: {
      listingId: listing.listingId,
      contentId: close.contentId,
      declaredPriceZar: listing.declaredPriceZar,
      reconciledPriceZar: close.reconciledPriceZar,
      termMonths: listing.termMonths,
      status: close.status,
      declaredBy: listing.declaredBy,
      provenance: close.provenance,
    },
    source,
    confidence: recon.confidence,
  })

  await world.relate({
    from: entity.id,
    type: 'listed_by',
    to: agent.id,
    validFrom: at,
    source,
  })

  await world.assertFact({
    about: entity.id,
    predicate: 'declared_price_zar',
    value: listing.declaredPriceZar,
    source,
    confidence: 1,
  })

  await world.assertFact({
    about: entity.id,
    predicate: 'reconciled_price_zar',
    value: close.reconciledPriceZar,
    source,
    confidence: recon.confidence,
  })

  await world.assertFact({
    about: entity.id,
    predicate: 'status',
    value: close.status,
    source,
    confidence: 1,
  })

  // A conflict the critic resolved is part of the canonical record: what disagreed,
  // and which position won.
  const eventsBefore = world.events().length
  for (const conflict of recon.conflicts) {
    await world.assertFact({
      about: entity.id,
      predicate: `conflict:${conflict.field}`,
      value: {
        positions: conflict.positions,
        winner: conflict.resolution.winner,
        why: conflict.resolution.why,
      },
      source,
      confidence: recon.confidence,
    })
  }

  const events = world.events()
  const eventIds = events.slice(eventsBefore).map((event) => event.id)
  const audit = world.audit()

  return {
    entityId: entity.id,
    agentEntityId: agent.id,
    eventIds,
    auditSeq: audit.length,
  }
}
