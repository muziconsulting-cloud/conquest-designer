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
 *
 * The challenge also teaches the **H-MEM** engine (Meterless) what survived it. The
 * memories that carried the value the exchange finally recorded are reinforced; the
 * owner's claim, where the evidence contradicted it, is marked wrong and flagged for
 * review; an independent observation that simply lost is marked unhelpful. The engine
 * adapts its confidence and keeps the ledger — so the next run recalls a different
 * memory than this one did.
 */

import type { Critique, Listing } from '../types.ts'
import type { Reconciliation } from './contracts.ts'
import type { EngineSession } from '../engines/session.ts'
import type { FeedbackKind } from '../engines/hmem/types.ts'

const PRICE_FIELD = 'priceZar'
const TERM_FIELD = 'termMonths'

export interface MemoryFeedback {
  memoryId: string
  kind: FeedbackKind
  delta: number
  reason: string
}

export interface CritiqueInput {
  listing: Listing
  recon: Reconciliation
  session: EngineSession
}

export interface CritiqueResult {
  critique: Critique
  /** What the challenge taught the memory engine. */
  feedback: MemoryFeedback[]
}

export function critiqueListing({ listing, recon, session }: CritiqueInput): CritiqueResult {
  const declaredPrice = String(listing.declaredPriceZar)
  const declaredTerm = String(listing.termMonths)

  const supportedPrice = recon.values[PRICE_FIELD]
  if (supportedPrice === undefined) {
    return {
      critique: {
        verdict: 'hold',
        reason: `No independent source supports the declared price of R${declaredPrice}.`,
        conflicts: recon.conflicts,
        supportingMemoryIds: recon.memoryIds,
      },
      feedback: teachMemory(session, listing, recon, 'hold', {}),
    }
  }

  if (supportedPrice !== declaredPrice) {
    return {
      critique: {
        verdict: 'hold',
        reason:
          `The reconciled evidence supports R${supportedPrice} (${recon.provenance[PRICE_FIELD]}), ` +
          `not the declared R${declaredPrice}. The listing is held, not published.`,
        conflicts: recon.conflicts,
        supportingMemoryIds: recon.memoryIds,
      },
      feedback: teachMemory(session, listing, recon, 'hold', {}),
    }
  }

  const supportedTerm = recon.values[TERM_FIELD]
  if (supportedTerm !== undefined && supportedTerm !== declaredTerm) {
    return {
      critique: {
        verdict: 'revise',
        reason:
          `The price agrees (R${declaredPrice}), but the term does not: the evidence says ` +
          `${supportedTerm} months (${recon.provenance[TERM_FIELD]}), the declaration says ` +
          `${declaredTerm}. Revise the term and publish.`,
        conflicts: recon.conflicts,
        supportingMemoryIds: recon.memoryIds,
      },
      feedback: teachMemory(session, listing, recon, 'revise', {
        [TERM_FIELD]: supportedTerm,
      }),
    }
  }

  const corroborating = recon.corroborated[PRICE_FIELD] ?? []
  const single = corroborating.length === 1
  return {
    critique: {
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
    },
    feedback: teachMemory(session, listing, recon, 'accept', {}),
  }
}

/**
 * Tell the memory engine what survived the challenge.
 *
 * The value the exchange recorded per field decides the feedback:
 *  - a memory that carried the recorded value is reinforced (`helpful`);
 *  - an independent observation that carried another value is marked unhelpful;
 *  - the owner's declaration, where the evidence contradicted it, is marked wrong and
 *    flagged for review.
 *
 * A held price has no recorded value: nothing survived, so no price claim is reinforced.
 */
function teachMemory(
  session: EngineSession,
  listing: Listing,
  recon: Reconciliation,
  verdict: 'accept' | 'revise' | 'hold',
  revised: Record<string, string>,
): MemoryFeedback[] {
  const recorded: Record<string, string | undefined> = {
    [PRICE_FIELD]:
      verdict === 'hold' ? undefined : String(listing.declaredPriceZar),
    [TERM_FIELD]: revised[TERM_FIELD] ?? String(listing.termMonths),
  }

  const feedback: MemoryFeedback[] = []

  for (const indexed of session.index.values()) {
    if (indexed.listingId !== listing.listingId) continue
    const value = recorded[indexed.field]
    if (value === undefined) {
      // Nothing survived for this field.
      if (indexed.owner) {
        apply(session, indexed.memoryId, 'wrong', feedback, 'the claim was contradicted')
      } else {
        apply(session, indexed.memoryId, 'not_helpful', feedback, 'no value survived the challenge')
      }
      continue
    }

    if (indexed.value === value) {
      apply(session, indexed.memoryId, 'helpful', feedback, 'it carried the recorded value')
      continue
    }

    if (indexed.owner) {
      apply(session, indexed.memoryId, 'wrong', feedback, 'the evidence contradicted the claim')
    } else {
      apply(session, indexed.memoryId, 'not_helpful', feedback, 'another source carried the value')
    }
  }

  return feedback
}

function apply(
  session: EngineSession,
  memoryId: string,
  kind: FeedbackKind,
  feedback: MemoryFeedback[],
  reason: string,
): void {
  const result = session.hmem.feedback(memoryId, kind)
  if (!result.applied) return
  feedback.push({ memoryId, kind, delta: result.delta, reason })
}
