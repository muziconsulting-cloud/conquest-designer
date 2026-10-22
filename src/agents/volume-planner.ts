/**
 * The volume planner — which sources to pull, and in what order.
 *
 * It decides, per listing, which federated sources speak to the fields the listing
 * claims, and orders the pull by each source's base trust. A source that could not
 * answer is marked here, so the reconciler can degrade instead of the run dying.
 *
 * It does not decide anything about the price. That is the reconciler's job, and the
 * critic's.
 */

import type { Listing } from '../types.ts'
import type { Plan, SourceDescriptor } from './contracts.ts'

export interface PlanInput {
  listing: Listing
  registry: SourceDescriptor[]
}

export interface PlanResult {
  plan: Plan
  /** One line per source the pull touched. */
  queries: Array<{ source: string; fields: string[]; answered: boolean }>
}

export function planSources({ listing, registry }: PlanInput): PlanResult {
  const referenced = new Set(listing.evidence.map((evidence) => evidence.source))

  const sources = registry
    .filter((source) => referenced.has(source.id))
    .map((source) => {
      // A source that answered with nothing is a source that did not answer: the
      // sample data carries an unavailable observation as an empty value at zero
      // confidence, and the planner is where that becomes visible.
      const observations = listing.evidence.filter((evidence) => evidence.source === source.id)
      const silent =
        observations.length > 0 &&
        observations.every(
          (evidence) => evidence.value === '' && evidence.provenance.confidence === 0,
        )
      return { ...source, available: source.available && !silent }
    })
    .sort((a, b) => b.trust - a.trust || a.id.localeCompare(b.id))

  // The owner's declaration is the claim, not a source to pull: it is already in
  // the listing. Only the independent sources are queried.
  const independent = sources.filter((source) => source.kind !== 'owner')
  const unavailable = independent
    .filter((source) => !source.available)
    .map((source) => source.id)
  const answered = independent
    .filter((source) => source.available)
    .map((source) => source.id)

  const fields = [
    ...new Set(listing.evidence.map((evidence) => evidence.field)),
  ].sort()

  const queries = independent.map((source) => ({
    source: source.id,
    fields: [
      ...new Set(
        listing.evidence
          .filter((evidence) => evidence.source === source.id)
          .map((evidence) => evidence.field),
      ),
    ].sort(),
    answered: source.available,
  }))

  return { plan: { sources, fields, unavailable, answered }, queries }
}
